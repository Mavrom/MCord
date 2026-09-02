/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { ApplicationCommandOptionType, type Command, findOption } from "../../api/commands";
import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

const commands: Command[] = [{
    name: "choose",
    description: "Verilenlerden birini rastgele seç (virgülle ayır)",
    options: [{ name: "options", description: "Girdi", type: ApplicationCommandOptionType.STRING, required: true }],
    execute: args => {
        const raw = findOption(args, "options", "");
        const parts = raw.split(",").map(s => s.trim()).filter(Boolean);
        if (parts.length < 2) return { content: "En az iki seçenek ver (virgülle ayır)." };
        return { content: `🤔 ${parts[Math.floor(Math.random() * parts.length)]}` };
    }
}];

export default definePlugin({
    name: "Choose",
    description: "`/choose` — Verilenlerden birini rastgele seç (virgülle ayır)",
    authors: [Devs.Berk],
    tags: ["komut"],
    dependencies: ["CommandsAPI"],
    commands
});
