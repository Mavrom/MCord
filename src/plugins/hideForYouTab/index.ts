/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "HideForYouTab",
    description: "Sunucu keşfet/senin için sekmelerini gizler",
    authors: [Devs.Berk],
    tags: ["ui"],
    requiresRestart: false,

    managedStyle: `[data-list-item-id*="guildsnav___for-you"], [aria-label*="Senin İçin" i] { display: none !important; }
`
});
