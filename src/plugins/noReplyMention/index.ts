/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { definePlugin, OptionType } from "../../utils/types";
import { UserStore } from "../../webpack/common";

const settings = definePluginSettings({
    exceptDirect: {
        type: OptionType.BOOLEAN,
        description: "Sana yapılan yanıtlarda (senin mesajına) yine de etiketle",
        default: false
    }
});

/**
 * Kanıtlanmış açık-kaynak istemcinin (Vencord) `NoReplyMention` patch'inin
 * portu.
 *
 * Eski MCord sürümü `start()` içinde eager `findByKeys("sendMessage",
 * "editMessage")` ile `MessageActions`'ı arıyordu; modül o an yüklü olmadığı
 * için hiç bağlanmıyordu. Kod patch'i doğrudan yanıt kutusundaki
 * `shouldMention` kararını değiştiriyor — zamanlamadan bağımsız, CI doğruluyor.
 */
export default definePlugin({
    name: "NoReplyMention",
    description: "Bir mesaja yanıt verirken karşı tarafı varsayılan olarak etiketlemez",
    authors: [Devs.Berk],
    tags: ["mesaj", "gizlilik"],
    settings,
    requiresRestart: true,

    patches: [
        {
            find: ",\"Message\")}function",
            reason: "Yanıt kutusunun `shouldMention` varsayılanı burada hesaplanıyor (Shift ile tersleniyor).",
            replacement: {
                match: /:(\i),shouldMention:!(\i)\.shiftKey/,
                replace: ":$1,shouldMention:$self.shouldMention($1,$2.shiftKey)"
            }
        }
    ],

    /** `true` → etiketle. Shift basılıysa Discord'un varsayılanı tersleniyor. */
    shouldMention(message: any, isHoldingShift: boolean): boolean {
        try {
            if (settings.store.exceptDirect) {
                const me = UserStore?.getCurrentUser?.()?.id;
                // Yanıt bize yapılmışsa etiketlemeyi koru.
                if (me != null && message?.author?.id === me) return !isHoldingShift;
            }
        } catch { /* store hazır değil */ }

        // Varsayılan: etiketleme. Shift ile etiketle.
        return isHoldingShift;
    }
});
