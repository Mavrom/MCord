/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { type Command } from "../../api/commands";
import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

const commands: Command[] = [{
    name: "now",
    description: "Discord dinamik zaman damgası ekle",
    execute: () => {
        return { content: `<t:${Math.floor(Date.now() / 1000)}:F> (<t:${Math.floor(Date.now() / 1000)}:R>)` };
    }
}];

export default definePlugin({
    name: "Timestamp",
    description: "`/now` — Discord dinamik zaman damgası ekle",
    authors: [Devs.Berk],
    tags: ["komut"],
    dependencies: ["CommandsAPI"],
    commands
});
