/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "NoSuggestedFriends",
    description: "Arkadaş listesindeki 'önerilen' bölümünü gizler",
    authors: [Devs.Berk],
    tags: ["ui","gizlilik"],
    requiresRestart: false,

    managedStyle: `[class*="suggestedFriends_"], [aria-label*="önerilen" i] { display: none !important; }
`
});
