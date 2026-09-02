/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { ApplicationCommandOptionType, type Command, findOption } from "../../api/commands";
import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

/** Metni harf harf rastgele büyük/küçük yapar (mocking SpongeBob). */
function mock(input: string): string {
    let result = "";
    for (let i = 0; i < input.length; i++) {
        const char = input[i];
        result += i % 2 === 0 ? char.toLowerCase() : char.toUpperCase();
    }
    return result;
}

const textArg = [{
    name: "message",
    description: "Girdi metni",
    type: ApplicationCommandOptionType.STRING,
    required: true
}] as const;

const commands: Command[] = [
    {
        name: "echo",
        description: "MCord üzerinden görünmez bir bot mesajı gibi metni yansıtır",
        options: [...textArg],
        execute: args => ({ content: findOption(args, "message", "") })
    },
    {
        name: "shrug",
        description: "¯\\_(ツ)_/¯ ekler",
        options: [{ name: "message", description: "Önüne eklenecek metin", type: ApplicationCommandOptionType.STRING, required: false }],
        execute: args => ({
            content: `${findOption(args, "message", "")} ¯\\_(ツ)_/¯`.trim()
        })
    },
    {
        name: "tableflip",
        description: "(╯°□°)╯︵ ┻━┻ ekler",
        options: [{ name: "message", description: "Önüne eklenecek metin", type: ApplicationCommandOptionType.STRING, required: false }],
        execute: args => ({
            content: `${findOption(args, "message", "")} (╯°□°)╯︵ ┻━┻`.trim()
        })
    },
    {
        name: "unflip",
        description: "┬─┬ ノ( ゜-゜ノ) ekler",
        options: [{ name: "message", description: "Önüne eklenecek metin", type: ApplicationCommandOptionType.STRING, required: false }],
        execute: args => ({
            content: `${findOption(args, "message", "")} ┬─┬ ノ( ゜-゜ノ)`.trim()
        })
    },
    {
        name: "lenny",
        description: "( ͡° ͜ʖ ͡°) ekler",
        options: [{ name: "message", description: "Önüne eklenecek metin", type: ApplicationCommandOptionType.STRING, required: false }],
        execute: args => ({
            content: `${findOption(args, "message", "")} ( ͡° ͜ʖ ͡°)`.trim()
        })
    },
    {
        name: "mock",
        description: "MeTnİ aLaYcI bÜyÜk/kÜçÜk hArFe çEvIrIr",
        options: [...textArg],
        execute: args => ({ content: mock(findOption(args, "message", "")) })
    },
    {
        name: "spoiler",
        description: "Her kelimeyi spoiler etiketiyle sarar",
        options: [...textArg],
        execute: args => ({
            content: findOption(args, "message", "")
                .split(" ")
                .map(word => (word ? `||${word}||` : word))
                .join(" ")
        })
    }
];

export default definePlugin({
    name: "MoreCommands",
    description: "echo, mock, shrug, lenny, spoiler, tableflip gibi ek eğik çizgi komutları",
    authors: [Devs.Berk],
    tags: ["komut", "eglence"],
    dependencies: ["CommandsAPI"],

    commands
});
