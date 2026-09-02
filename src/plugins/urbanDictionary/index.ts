/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { ApplicationCommandOptionType, type Command, findOption } from "../../api/commands";
import { fetchJson } from "../../api/net";
import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

interface UrbanResult {
    list: Array<{ word: string; definition: string; example: string; permalink: string }>;
}

const commands: Command[] = [{
    name: "urban",
    description: "Urban Dictionary'de terim ara",
    options: [{ name: "term", description: "Aranacak terim", type: ApplicationCommandOptionType.STRING, required: true }],
    execute: async args => {
        const term = findOption(args, "term", "");
        const data = await fetchJson<UrbanResult>(`https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(term)}`);
        const top = data.list?.[0];
        if (!top) return { content: `"${term}" için tanım yok.` };

        const clean = (s: string) => s.replace(/[[\]]/g, "").trim();
        return {
            content: [
                `**${top.word}**`,
                clean(top.definition),
                top.example ? `> ${clean(top.example).replace(/\n/g, "\n> ")}` : "",
                `<${top.permalink}>`
            ].filter(Boolean).join("\n\n")
        };
    }
}];

export default definePlugin({
    name: "UrbanDictionary",
    description: "`/urban` — Urban Dictionary tanımı getirir",
    authors: [Devs.Berk],
    tags: ["komut"],
    dependencies: ["CommandsAPI"],
    commands
});
