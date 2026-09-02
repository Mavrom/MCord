/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "NoWelcomeBanner",
    description: "Yeni kanalların üstündeki hoş geldin/başlangıç afişini gizler",
    authors: [Devs.Berk],
    tags: ["ui"],
    requiresRestart: false,

    managedStyle: `[class*="newMemberBanner_"], [class*="channelIntro_"] [class*="banner_"] { display: none !important; }
`
});
