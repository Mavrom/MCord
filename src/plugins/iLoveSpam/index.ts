/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "ILoveSpam",
    description: "Discord'un 'muhtemel spamcı' işaretli mesajları gizlemesini engeller",
    authors: [Devs.Berk],
    tags: ["mesaj", "görünürlük"],

    patches: [{
        find: "hasFlag:{writable",
        reason: "Spamcı mesajlarını gizleten mesaj bayrağı kontrolü model fabrikasında gömülü.",
        replacement: {
            match: /if\((\i)<=(?:0x40000000|1<<30|1073741824)\)return/,
            replace: "if($1===1048576)return false;$&"
        }
    }]
});
