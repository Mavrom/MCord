/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { definePluginSettings } from "../../api/settings";
import { OptionType } from "../../utils/types";

export const settings = definePluginSettings({
    logDeletes: { type: OptionType.BOOLEAN, description: "Silinen mesajları yalnızca bu istemcide görünür tut", default: true },
    logEdits: { type: OptionType.BOOLEAN, description: "Düzenlenen mesajların önceki içeriklerini yerelde sakla", default: true },
    logDeletedAttachments: { type: OptionType.BOOLEAN, description: "Düzenleme sırasında kaldırılan eklerin bağlantılarını sakla", default: true },
    inlineEdits: { type: OptionType.BOOLEAN, description: "Önceki düzenlemeleri mesajın altında göster", default: true },
    deleteStyle: {
        type: OptionType.SELECT,
        description: "Silinen mesajın görünümü",
        options: [{ label: "Kırmızı metin", value: "text", default: true }, { label: "Kırmızı arka plan", value: "overlay" }]
    },
    collapseDeleted: { type: OptionType.BOOLEAN, description: "Silinen mesajın metnini daralt; göster düğmesiyle aç", default: false },
    ignoreBots: { type: OptionType.BOOLEAN, description: "Bot mesajlarını kaydetme", default: true },
    ignoreSelf: { type: OptionType.BOOLEAN, description: "Kendi mesajlarını kaydetme", default: false },
    ignoreUsers: { type: OptionType.STRING, description: "Kaydedilmeyecek kullanıcı kimlikleri (virgülle ayır)", default: "" },
    ignoreChannels: { type: OptionType.STRING, description: "Kaydedilmeyecek kanal veya üst kanal kimlikleri (virgülle ayır)", default: "" },
    ignoreGuilds: { type: OptionType.STRING, description: "Kaydedilmeyecek sunucu kimlikleri (virgülle ayır)", default: "" },
    maxEntries: {
        type: OptionType.SLIDER,
        description: "Oturumda geçmişi tutulacak en fazla mesaj",
        markers: [100, 250, 500, 1000, 2500],
        default: 500,
        stickToMarkers: true
    }
});
