/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "HideChatButtons",
    description: "Sohbet kutusundaki hediye, GIF, sticker ve emoji düğmelerini gizler",
    authors: [Devs.Berk],
    tags: ["ui"],
    requiresRestart: false,

    managedStyle: `
[class*="buttons_"] [aria-label*="hediye" i],
[class*="buttons_"] [aria-label*="gift" i],
[class*="buttons_"] [aria-label*="GIF" i],
[class*="buttons_"] [aria-label*="sticker" i],
[class*="buttons_"] [aria-label*="ıkartma"],
[class*="buttons_"] [aria-label*="emoji" i] { display: none !important; }
`
});
