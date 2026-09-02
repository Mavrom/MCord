/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { ApplicationCommandOptionType, type Command, findOption } from "../../api/commands";
import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

const commands: Command[] = [{
    name: "sarcasm",
    description: "MeTni SaRkAsTiK yaz",
    options: [{ name: "message", description: "Girdi", type: ApplicationCommandOptionType.STRING, required: true }],
    execute: args => {
        const t = findOption(args, "message", "");
        let up = false, out = "";
        for (const c of t) { if (/[a-zçğıöşü]/i.test(c)) { out += up ? c.toUpperCase() : c.toLowerCase(); up = !up; } else out += c; }
        return { content: out };
    }
}];

export default definePlugin({
    name: "Sarcasm",
    description: "`/sarcasm` — MeTni SaRkAsTiK yaz",
    authors: [Devs.Berk],
    tags: ["komut", "eglence"],
    dependencies: ["CommandsAPI"],
    commands
});
