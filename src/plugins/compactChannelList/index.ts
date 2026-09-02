/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "CompactChannelList",
    description: "Kanal listesi satır yüksekliğini ve boşluklarını daraltır",
    authors: [Devs.Berk],
    tags: ["ui"],
    requiresRestart: false,

    managedStyle: `
[class*="containerDefault_"] [class*="link_"] { height: 28px !important; }
[class*="wrapper_"] [class*="modeDefault_"] { padding-top: 1px !important; padding-bottom: 1px !important; }
`
});
