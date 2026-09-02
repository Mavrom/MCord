/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "NoNowPlayingCard",
    description: "Kullanıcı panelindeki 'şimdi çalıyor' Spotify kartını gizler",
    authors: [Devs.Berk],
    tags: ["ui"],
    requiresRestart: false,

    managedStyle: `[class*="panels_"] [class*="nowPlayingContainer_"] { display: none !important; }
`
});
