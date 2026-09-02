/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "HideBotTag",
    description: "’BOT / UYGULAMA’ etiketlerini gizler",
    authors: [Devs.Berk],
    tags: ["ui"],
    requiresRestart: false,

    managedStyle: `
[class*="botTag_"], [class*="botTagRegular_"] { display: none !important; }
`
});
