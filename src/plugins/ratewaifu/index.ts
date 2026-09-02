/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { ApplicationCommandOptionType, type Command, findOption } from "../../api/commands";
import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

const commands: Command[] = [{
    name: "rate",
    description: "Bir şeye 0-100 arası (deterministik) puan ver",
    options: [{ name: "thing", description: "Girdi", type: ApplicationCommandOptionType.STRING, required: true }],
    execute: args => {
        const thing = findOption(args, "thing", "");
        let h = 0;
        for (const c of thing) h = (h * 31 + c.charCodeAt(0)) >>> 0;
        return { content: `**${thing}** → ${h % 101}/100` };
    }
}];

export default definePlugin({
    name: "RateThis",
    description: "`/rate` — Bir şeye 0-100 arası (deterministik) puan ver",
    authors: [Devs.Berk],
    tags: ["komut"],
    dependencies: ["CommandsAPI"],
    commands
});
