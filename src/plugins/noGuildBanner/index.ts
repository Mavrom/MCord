/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "NoGuildBanner",
    description: "Kanal listesi üstündeki sunucu banner görselini kaldırır",
    authors: [Devs.Berk],
    tags: ["ui"],
    requiresRestart: false,

    managedStyle: `
[class*="animatedContainer_"] [class*="bannerImage_"],
[class*="hasBanner_"] [class*="bannerImage_"] { display: none !important; }
`
});
