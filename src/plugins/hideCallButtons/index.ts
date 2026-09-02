/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "HideCallButtons",
    description: "DM başlığındaki sesli/görüntülü arama düğmelerini gizler",
    authors: [Devs.Berk],
    tags: ["ui"],
    requiresRestart: false,

    managedStyle: `[class*="titleWrapper_"] button[aria-label*="arama" i], [class*="title_"] button[aria-label*="call" i] { display: none !important; }
`
});
