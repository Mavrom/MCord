/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "CompactUserPopout",
    description: "Kullanıcı pop-out kartındaki büyük boşlukları daraltır",
    authors: [Devs.Berk],
    tags: ["ui"],
    requiresRestart: false,

    managedStyle: `
[class*="userPopout"] [class*="body_"] { padding-top: 8px !important; }
[class*="userPopout"] [class*="banner_"] { min-height: 48px !important; }
`
});
