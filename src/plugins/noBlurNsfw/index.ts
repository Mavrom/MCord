/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "NoBlurNsfw",
    description: "Spoiler ve NSFW ekli görsellerdeki bulanıklığı kaldırır",
    authors: [Devs.Berk],
    tags: ["medya"],
    requiresRestart: false,

    managedStyle: `
[class*="hiddenSpoilers_"] [class*="spoilerContent_"],
[class*="obscure_"] { filter: none !important; }
`
});
