/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "NoQuestPopup",
    description: "Görev (Quest) reklam pop-up ve rozetlerini gizler",
    authors: [Devs.Mavrom],
    tags: ["ui"],
    requiresRestart: false,

    managedStyle: `[class*="questBadge_"], [class*="questsHeader_"], [class*="questPopout_"] { display: none !important; }
`
});
