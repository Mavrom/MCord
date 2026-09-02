/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "HideCustomStatusEmoji",
    description: "Özel durum emojilerini gizler (metni bırakır)",
    authors: [Devs.Berk],
    tags: ["ui"],
    requiresRestart: false,

    managedStyle: `[class*="customStatus_"] img[class*="emoji"] { display: none !important; }
`
});
