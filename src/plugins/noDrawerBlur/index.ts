/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "NoDrawerBlur",
    description: "Menü ve çekmece arkasındaki bulanıklık efektini kaldırır (performans)",
    authors: [Devs.Berk],
    tags: ["ui", "performans"],
    requiresRestart: false,

    managedStyle: `
[class*="backdrop_"] { backdrop-filter: none !important; }
`
});
