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
        find: "unknownUserMentionPlaceholder:",
        reason: "Salt görsel bağlantısını gizleme kararı mesaj içerik render'ında yerel embed kontrolü.",
        replacement: {
            match: /\i\.has\(\i\.type\)&&\(0,\i\.\i\)\(\i\)/,
            replace: "false"
        }
    }]
});
