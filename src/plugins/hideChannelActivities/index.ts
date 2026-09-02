/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "HideChannelActivities",
    description: "Kanal listesindeki sesli kanal etkinlik önizlemelerini gizler",
    authors: [Devs.Berk],
    tags: ["ui"],
    requiresRestart: false,

    managedStyle: `[class*="voiceChannelEmbed_"], [class*="channelActivities_"] { display: none !important; }
`
});
