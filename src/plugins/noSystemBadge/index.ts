/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "NoSystemBadge",
    description: "Görev çubuğu ve sistem tepsisi okunmamış bildirim rozetini kapatır",
    authors: [Devs.Berk],
    tags: ["bildirim", "windows"],

    patches: [{
        find: ",setSystemTrayApplications",
        reason: "Windows görev çubuğu ve tepsi rozetleri native köprü metodlarında güncelleniyor.",
        replacement: [
            {
                match: /setBadge\(\i\).+?},/,
                replace: "setBadge(){},"
            },
            {
                match: /setSystemTrayIcon\(\i\).+?},/,
                replace: "setSystemTrayIcon(){},"
            }
        ]
    }]
});
