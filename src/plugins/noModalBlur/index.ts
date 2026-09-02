/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "NoModalBackdropBlur",
    description: "Modal arkaplanındaki bulanıklığı kaldırır (yalnızca karartma kalır)",
    authors: [Devs.Berk],
    tags: ["ui","performans"],
    requiresRestart: false,

    managedStyle: `
[class*="backdrop_"][class*="withLayer_"] { backdrop-filter: none !important; }
`
});
