/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { type Command } from "../../api/commands";
import { fetchJson } from "../../api/net";
import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

const commands: Command[] = [{
    name: "dadjoke",
    description: "Rastgele (İngilizce) baba şakası",
    execute: async () => {
        const data = await fetchJson<{ joke: string }>("https://icanhazdadjoke.com/", { headers: { Accept: "application/json" } });
        return { content: data.joke ?? "..." };
    }
}];

export default definePlugin({
    name: "DadJoke",
    description: "`/dadjoke` — Rastgele (İngilizce) baba şakası",
    authors: [Devs.Berk],
    tags: ["komut", "eglence"],
    dependencies: ["CommandsAPI"],
    commands
});
