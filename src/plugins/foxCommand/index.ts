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
    name: "fox",
    description: "Rastgele tilki resmi",
    execute: async () => {
        const data = await fetchJson<{ image: string }>("https://randomfox.ca/floof/");
        return { content: data.image ?? "Tilki bulunamadı 🦊" };
    }
}];

export default definePlugin({
    name: "FoxCommand",
    description: "`/fox` — Rastgele tilki resmi",
    authors: [Devs.Berk],
    tags: ["komut", "eglence"],
    dependencies: ["CommandsAPI"],
    commands
});
