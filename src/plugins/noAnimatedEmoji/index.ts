/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "NoAnimatedEmoji",
    description: "Hareketli emojileri durdurur (ilk kare)",
    authors: [Devs.Berk],
    tags: ["performans","ui"],
    requiresRestart: false,

    managedStyle: `img[class*="emoji"][src*=".gif"] { animation: none !important; }
`
});
