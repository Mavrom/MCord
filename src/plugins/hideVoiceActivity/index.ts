/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "HideVoiceActivity",
    description: "Sunucu ve DM listelerinde ’oyun oynuyor / dinliyor’ göstergelerini gizler",
    authors: [Devs.Berk],
    tags: ["ui","gizlilik"],
    requiresRestart: false,

    managedStyle: `
[class*="activityText_"], [class*="gameIcon_"] { display: none !important; }
`
});
