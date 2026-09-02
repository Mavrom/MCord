/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "HideMemberListButton",
    description: "Kanal başlığındaki üye listesi aç/kapa düğmesini gizler",
    authors: [Devs.Berk],
    tags: ["ui"],
    requiresRestart: false,

    managedStyle: `[class*="toolbar_"] [aria-label*="Üye Listesi" i], [class*="toolbar_"] [aria-label*="Member List" i] { display: none !important; }
`
});
