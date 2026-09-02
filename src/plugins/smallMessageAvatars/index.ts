/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "SmallMessageAvatars",
    description: "Mesaj yanındaki avatarları küçültür",
    authors: [Devs.Berk],
    tags: ["ui"],
    requiresRestart: false,

    managedStyle: `[class*="cozyMessage_"] [class*="avatar_"] { width: 28px !important; height: 28px !important; left: 8px !important; }
`
});
