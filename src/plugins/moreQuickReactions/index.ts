/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { definePlugin, OptionType } from "../../utils/types";

const settings = definePluginSettings({
    count: {
        type: OptionType.NUMBER,
        description: "Hızlı reaksiyon menüsündeki emoji sayısı (0-42)",
        default: 5,
        isValid: value => value >= 0 && value <= 42 || "Değer 0 ile 42 arasında olmalı"
    }
});

export default definePlugin({
    name: "MoreQuickReactions",
    description: "Mesaj hızlı reaksiyon menüsünde gösterilen emoji sayısını artırır",
    authors: [Devs.Mavrom],
    tags: ["reaksiyon", "emoji"],
    settings,

    patches: [{
        // Anahtar artık bağlam menüsü modülünde de geçiyor; `),children` yalnız
        // hover araç çubuğunun `aria-label`'ında (Vencord ile aynı).
        find: "#{intl::MESSAGE_UTILITIES_A11Y_LABEL}),children",
        reason: "Hızlı reaksiyon dizisi mesaj hover araç çubuğunda üç öğeye inline dilimleniyor.",
        replacement: {
            match: /(?<=length>=3\?.{0,50})\.slice\(0,3\)/,
            replace: ".slice(0,$self.settings.store.count)"
        }
    }]
});
