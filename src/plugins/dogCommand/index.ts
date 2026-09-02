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
    name: "dog",
    description: "Rastgele köpek resmi",
    execute: async () => {
        const data = await fetchJson<{ message: string }>("https://dog.ceo/api/breeds/image/random");
        return { content: data.message ?? "Köpek bulunamadı 🐶" };
    }
}];

export default definePlugin({
    name: "DogCommand",
    description: "`/dog` — Rastgele köpek resmi",
    authors: [Devs.Berk],
    tags: ["komut", "eglence"],
    dependencies: ["CommandsAPI"],
    commands
});
