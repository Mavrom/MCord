/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "ImageLink",
    description: "Tek başına gönderilen görsel bağlantısını embed oluşsa bile görünür tutar",
    authors: [Devs.Berk],
    tags: ["medya", "bağlantı"],

    patches: [{
        // Embed kontrolü render modülünden küçük bir util modülüne taşındı (Vencord ile aynı find).
        find: "={linkCount:0,onlyLinks:!1};function ",
        reason: "Salt görsel bağlantısını gizleme kararı mesaj içerik render'ında yerel embed kontrolü.",
        replacement: {
            // SimpleEmbedTypes.has(embed.type) && isEmbedInline(embed)
            match: /\i\.has\(\i\.type\)&&\(0,\i\.\i\)\(\i\)/,
            replace: "false"
        }
    }]
});
