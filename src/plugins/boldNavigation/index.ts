/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "BoldUnreadChannels",
    description: "Okunmamış kanalları kalın ve daha belirgin yapar",
    authors: [Devs.Berk],
    tags: ["ui"],
    requiresRestart: false,

    managedStyle: `[class*="unread_"] [class*="name_"] { font-weight: 700 !important; color: var(--text-normal) !important; }
`
});
