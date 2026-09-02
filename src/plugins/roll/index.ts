/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { ApplicationCommandOptionType, type Command, findOption } from "../../api/commands";
import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

function rollDice(count: number, sides: number): { rolls: number[]; total: number } {
    const rolls: number[] = [];
    for (let i = 0; i < count; i++) {
        rolls.push(1 + Math.floor(Math.random() * sides));
    }
    return { rolls, total: rolls.reduce((a, b) => a + b, 0) };
}

const commands: Command[] = [{
    name: "roll",
    description: "Zar at — /roll [yüz] [adet]",
    options: [
        { name: "sides", description: "Zarın yüz sayısı (varsayılan 6)", type: ApplicationCommandOptionType.INTEGER, required: false },
        { name: "count", description: "Kaç zar (varsayılan 1, en fazla 20)", type: ApplicationCommandOptionType.INTEGER, required: false }
    ],
    execute: args => {
        const sides = Math.max(2, Math.min(1000, Number(findOption(args, "sides", 6)) || 6));
        const count = Math.max(1, Math.min(20, Number(findOption(args, "count", 1)) || 1));
        const { rolls, total } = rollDice(count, sides);

        return {
            content: count === 1
                ? `🎲 ${count}d${sides} → **${total}**`
                : `🎲 ${count}d${sides} → ${rolls.join(" + ")} = **${total}**`
        };
    }
}];

export default definePlugin({
    name: "Roll",
    description: "`/roll` — zar atar (varsayılan 1d6)",
    authors: [Devs.Berk],
    tags: ["komut", "eglence"],
    dependencies: ["CommandsAPI"],
    commands
});
