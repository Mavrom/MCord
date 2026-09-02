/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { ApplicationCommandOptionType, type Command, findOption } from "../../api/commands";
import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

const commands: Command[] = [{
    name: "owo",
    description: "owo",
    options: [{ name: "message", description: "Girdi", type: ApplicationCommandOptionType.STRING, required: true }],
    execute: args => {
        const t = findOption(args, "message", "");
        return { content: t.replace(/[rl]/g, "w").replace(/[RL]/g, "W") + " owo" };
    }
}];

export default definePlugin({
    name: "Owoify",
    description: "`/owo` — owo",
    authors: [Devs.Berk],
    tags: ["komut", "eglence"],
    dependencies: ["CommandsAPI"],
    commands
});
