/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "CoinFlip",
    description: "`/flip` — yazı tura atar",
    authors: [Devs.Berk],
    tags: ["komut", "eglence"],
    dependencies: ["CommandsAPI"],

    commands: [{
        name: "flip",
        description: "Yazı tura at",
        execute: () => ({ content: Math.random() < 0.5 ? "🪙 Yazı" : "🪙 Tura" })
    }]
});
