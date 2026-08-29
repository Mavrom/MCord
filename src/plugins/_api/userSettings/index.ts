/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../../utils/constants";
import { definePlugin } from "../../../utils/types";

export default definePlugin({
    name: "UserSettingsAPI",
    description: "Plugin'lerin Discord'un kendi ayarlarını okuyup değiştirmesini sağlar",
    authors: [Devs.MCord],

    /**
     * `ChatComponentsAPI`'nin aksine her zaman açık değil: sadece kullanan
     * plugin'ler bunu `dependencies` alanında bildiriyor, `PluginManager`
     * o zaman otomatik etkinleştiriyor (plan §6.3). Discord'un ayar
     * tarama modülünü gereksiz yere patch'lememek için varsayılan kapalı.
     */
    patches: [
        {
            find: '"textAndImages","renderSpoilers"',
            reason:
                "Discord her ayarı `{getSetting,updateSetting,useSetting}` şeklinde "
                + "tek bir yardımcı fonksiyonla üretiyor, ama sonuca hangi grup/isimden "
                + "geldiğini yazmıyor — modülün export'ları rastgele kısa anahtarlarla "
                + "(`n.d` webpack export haritası) geliyor, grup/isim bilgisi sadece "
                + "kaynak kodun kendisinde. Dışarıdan tutulabilir bir fonksiyon "
                + "referansı yok, bu yüzden fonksiyon patch'i uygulanamıyor.",
            replacement: [
                {
                    // Adım 1: üretici fonksiyonun grup/isim parametrelerini kendi
                    // seçtiğimiz, çakışması imkansız isimlerle yakala. `\i` ile
                    // eşleşen orijinal minify edilmiş adlara bağımlı kalmıyoruz;
                    // fonksiyon adı ve son iki parametre değişmeden bırakılıyor.
                    match: /(function \i\()(\i),(\i)(,\i,\i\)\{)/,
                    replace: "$1$2,$3$4const $mcordGroup=$2,$mcordName=$3;"
                },
                {
                    // Adım 2: üretici fonksiyonun döndürdüğü nesneye, adım 1'de
                    // yakalanan grup/isim çiftini ekliyoruz. Anahtar sırası
                    // (`getSetting` hemen ardından `updateSetting`) bu yardımcıyı
                    // aynı modüldeki benzer şekilli diğer yardımcılardan ayırıyor.
                    match: /return\{getSetting:(\i),updateSetting:/,
                    replace: "return{getSetting:$1,mcordGroup:$mcordGroup,mcordName:$mcordName,updateSetting:"
                }
            ]
        }
    ]
});
