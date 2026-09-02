/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "NoNitroUpsell",
    description: "Nitro reklam/yükseltme afişlerini ve kilitli özellik ipuçlarını gizler",
    authors: [Devs.Berk],
    tags: ["ui"],
    requiresRestart: false,

    managedStyle: `
[class*="upsell" i], [class*="premiumUpsell" i], [class*="nitroUpsell" i],
[class*="unlockPerks" i] { display: none !important; }
`
});
