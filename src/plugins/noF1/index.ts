/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "NoF1",
    description: "F1 tuşunun Discord yardım sayfasını açmasını engeller",
    authors: [Devs.Berk],
    tags: ["kısayol"],

    patches: [{
        find: ',"f1"],comboKeysBindGlobal:',
        reason: "F1 tuşu global tuş bağı dizisinde sabit olarak tanımlı.",
        replacement: {
            match: ',"f1"],comboKeysBindGlobal:',
            replace: "],comboKeysBindGlobal:"
        }
    }]
});
