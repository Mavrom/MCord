/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "NoGuildDiscoveryButton",
    description: "Sunucu şeridindeki 'sunucu keşfet' pusula düğmesini gizler",
    authors: [Devs.Berk],
    tags: ["ui"],
    requiresRestart: false,

    managedStyle: `[data-list-item-id*="guildsnav___tutorial-container"], [class*="circleIconButton_"][aria-label*="Keşfet" i] { display: none !important; }
`
});
