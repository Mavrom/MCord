/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { ApplicationCommandOptionType, type Command, findOption } from "../../api/commands";
import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";
import { fullwidth, interleave, reverse, spaced } from "./transform";

const arg = [{ name: "message", description: "Girdi metni", type: ApplicationCommandOptionType.STRING, required: true }];

const commands: Command[] = [
    { name: "reverse", description: "Metni ters çevirir", options: [...arg], execute: a => ({ content: reverse(findOption(a, "message", "")) }) },
    { name: "fullwidth", description: "ｔａｍ ｇｅｎｉşｌｉｋ", options: [...arg], execute: a => ({ content: fullwidth(findOption(a, "message", "")) }) },
    { name: "spaced", description: "h a r f   a r a l ı", options: [...arg], execute: a => ({ content: spaced(findOption(a, "message", "")) }) },
    { name: "clap", description: "👏 kelimeler 👏 arası 👏 emoji", options: [...arg], execute: a => ({ content: interleave(findOption(a, "message", ""), "👏") }) }
];

export default definePlugin({
    name: "TextTools",
    description: "reverse, fullwidth, spaced, clap metin komutları",
    authors: [Devs.Berk],
    tags: ["komut", "eglence"],
    dependencies: ["CommandsAPI"],
    commands
});
