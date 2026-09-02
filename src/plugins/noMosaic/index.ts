/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "NoMosaic",
    description: "Birden fazla resmi ızgara (mozaik) yerine ayrı ayrı gösterir",
    authors: [Devs.Berk],
    tags: ["ui", "medya"],
    requiresRestart: false,

    managedStyle: `
[class*="mosaic_"] { display: flex !important; flex-direction: column !important; }
[class*="mosaicItem_"] { max-width: 100% !important; }
`
});
