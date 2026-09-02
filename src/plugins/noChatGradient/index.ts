/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "NoChatGradient",
    description: "Bazı temalardaki sohbet arkaplan degradelerini düz renge çevirir",
    authors: [Devs.Berk],
    tags: ["ui"],
    requiresRestart: false,

    managedStyle: `
[class*="chat_"] { background: var(--background-primary) !important; }
`
});
