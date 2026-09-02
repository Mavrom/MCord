/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "NoSpotifyEmbedCover",
    description: "Spotify yerleşik oynatıcısını daralt: sadece kontroller",
    authors: [Devs.Berk],
    tags: ["ui", "medya"],
    requiresRestart: false,

    managedStyle: `
iframe[src*="open.spotify.com/embed"] { height: 80px !important; }
`
});
