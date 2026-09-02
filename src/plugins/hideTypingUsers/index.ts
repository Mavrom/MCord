/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "HideTypingUsers",
    description: "'... yazıyor' göstergesindeki kullanıcı adlarını gizler, sadece '.. yazıyor' kalır",
    authors: [Devs.Berk],
    tags: ["ui", "gizlilik"],
    requiresRestart: false,

    managedStyle: `
[class*="typing_"] [class*="text_"] strong { display: none !important; }
`
});
