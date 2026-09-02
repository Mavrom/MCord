/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "NoModalAnimation",
    description: "Modal ve pop-out açılış/kapanış animasyonlarını kaldırır",
    authors: [Devs.Berk],
    tags: ["ui", "performans"],
    requiresRestart: false,

    managedStyle: `
[class*="animating_"], [class*="backdrop_"] { transition: none !important; animation: none !important; }
[class*="layer_"] { transform: none !important; }
`
});
