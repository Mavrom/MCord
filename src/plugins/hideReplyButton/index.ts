/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "HideHoverReply",
    description: "Mesaj üzerine gelince çıkan 'yanıtla' düğmesini gizler (sağ tık kalır)",
    authors: [Devs.Berk],
    tags: ["ui"],
    requiresRestart: false,

    managedStyle: `[class*="buttonContainer_"] [aria-label*="Yanıtla" i], [class*="buttonContainer_"] [aria-label*="Reply" i] { display: none !important; }
`
});
