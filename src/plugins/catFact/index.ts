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
    name: "catfact",
    description: "Rastgele kedi bilgisi (İngilizce)",
    execute: async () => {
        const data = await fetchJson<{ fact: string }>("https://catfact.ninja/fact");
        return { content: data.fact ?? "..." };
    }
}];

export default definePlugin({
    name: "CatFact",
    description: "`/catfact` — Rastgele kedi bilgisi (İngilizce)",
    authors: [Devs.Berk],
    tags: ["komut", "eglence"],
    dependencies: ["CommandsAPI"],
    commands
});
