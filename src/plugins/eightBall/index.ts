/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { ApplicationCommandOptionType, type Command, findOption } from "../../api/commands";
import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

const ANSWERS = [
    "Kesinlikle evet", "Büyük ihtimalle", "Bence evet", "Belirsiz, tekrar sor",
    "Şimdi söyleyemem", "Pek sanmıyorum", "Hayır", "Kesinlikle hayır", "Şüpheli"
];

const commands: Command[] = [{
    name: "8ball",
    description: "Sihirli 8 topuna sor",
    options: [{ name: "question", description: "Sorun", type: ApplicationCommandOptionType.STRING, required: true }],
    execute: args => {
        const q = findOption(args, "question", "");
        const a = ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
        return { content: `🎱 **Soru:** ${q}\n**Cevap:** ${a}` };
    }
}];

export default definePlugin({
    name: "EightBall",
    description: "`/8ball` — sihirli 8 topu sorunu yanıtlar",
    authors: [Devs.Berk],
    tags: ["komut", "eglence"],
    dependencies: ["CommandsAPI"],
    commands
});
