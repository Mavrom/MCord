/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "FullWidthChat",
    description: "Sohbeti pencere genişliğine yayar (maksimum genişlik sınırını kaldırır)",
    authors: [Devs.Berk],
    tags: ["ui"],
    requiresRestart: false,

    managedStyle: `[class*="messagesWrapper_"] [class*="scrollerInner_"] { max-width: none !important; }
`
});
