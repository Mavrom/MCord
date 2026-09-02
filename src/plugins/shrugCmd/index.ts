/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { type Command } from "../../api/commands";
import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

const commands: Command[] = [{
    name: "disappointed",
    description: "ಠ_ಠ",
    execute: () => {
        return { content: "ಠ_ಠ" };
    }
}];

export default definePlugin({
    name: "Disappointed",
    description: "`/disappointed` — ಠ_ಠ",
    authors: [Devs.Berk],
    tags: ["komut", "eglence"],
    dependencies: ["CommandsAPI"],
    commands
});
