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
    name: "cat",
    description: "Rastgele kedi resmi",
    execute: async () => {
        const data = await fetchJson<Array<{ url: string }>>("https://api.thecatapi.com/v1/images/search");
        return { content: data[0]?.url ?? "Kedi bulunamadı 😿" };
    }
}];

export default definePlugin({
    name: "CatCommand",
    description: "`/cat` — Rastgele kedi resmi",
    authors: [Devs.Berk],
    tags: ["komut", "eglence"],
    dependencies: ["CommandsAPI"],
    commands
});
