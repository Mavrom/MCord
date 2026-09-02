/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "NoMaskedUrlPaste",
    description: "Seçili metnin üstüne bağlantı yapıştırınca maskeli bağlantı oluşturulmasını engeller",
    authors: [Devs.Berk],
    tags: ["mesaj", "bağlantı"],

    patches: [{
        find: ".selection,preventEmojiSurrogates:",
        reason: "Seçili metni maskeli bağlantıya dönüştüren koşul editör yapıştırma işleyicisinde gömülü.",
        replacement: {
            match: /if\(null!=\i\.selection&&\i\.\i\.isExpanded\(\i\.selection\)\)/,
            replace: "if(false)"
        }
    }]
});
