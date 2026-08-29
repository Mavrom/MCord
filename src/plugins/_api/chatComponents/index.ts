/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { renderChatBarButtons } from "../../../api/chatComponents";
import { Devs } from "../../../utils/constants";
import { Logger } from "../../../utils/logger";
import { definePlugin } from "../../../utils/types";

const logger = new Logger("ChatComponentsAPI", "#f4b8e4");

export default definePlugin({
    name: "ChatComponentsAPI",
    description: "Plugin'lerin sohbet çubuğuna düğme eklemesini sağlar",
    authors: [Devs.MCord],
    required: true,

    patches: [
        {
            find: '"ChannelTextAreaButtons"',
            reason:
                "Düğmeler `j=[]` gibi yerel bir diziye push ediliyor ve dizi doğrudan "
                + "`children`'a veriliyor; dışarıdan tutulabilir bir fonksiyon referansı yok, "
                + "bu yüzden fonksiyon patch'i uygulanamıyor. Çapa `\"ChannelTextAreaButtons\"` "
                + "sabiti — bundle genelinde tek geçiyor ve Discord'un kendi bileşen adı olduğu "
                + "için minify sırasında değişmiyor.",
            replacement: {
                // Boşluk kontrolünden ÖNCE enjekte ediyoruz: Discord'un kendi düğmeleri
                // kapalıyken dizi boş kalır ve `null` dönerdi, bizimkiler de görünmezdi.
                //
                // Desen bilinçli olarak karakter mesafesine değil **yapıya** bağlı:
                // aynı ifade içinde (`;` görmeden) aynı dizinin `children` olarak
                // kullanılması aranıyor. Discord div'e prop eklerse ya da eleman türünü
                // değiştirirse desen tutmaya devam eder.
                // Eşleşme yalnızca `0===j.length` — yerine kendi içinde kapalı bir
                // virgül ifadesi konuyor. `)?null:` kısmı bilinçli olarak ileriye
                // bakışta: oradaki kapanış parantezi çok önce açılmış dış bir
                // parantezi kapatıyor, eşleşmeye dahil edilirse denge bozuluyor.
                match: /0===(\i)\.length(?=\)\?null:[^;]{0,200}?children:\1)/,
                replace: "($self.injectButtons($1,arguments[0]),0===$1.length)"
            }
        }
    ],

    /**
     * Kayıtlı düğmeleri Discord'un düğme dizisinin **sonuna** ekler.
     *
     * Patch'lenmiş kod her render'da çağırıyor; hata sızdırmamak kritik, aksi
     * halde sohbet girişi komple çöker.
     */
    injectButtons(buttons: unknown[], props: Record<string, any>): void {
        try {
            if (!Array.isArray(buttons) || props?.disabled) return;
            buttons.push(...renderChatBarButtons(props));
        } catch (err) {
            logger.error("Sohbet çubuğu düğmeleri eklenemedi:\n", err);
        }
    }
});
