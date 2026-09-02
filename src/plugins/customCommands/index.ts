/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import {
    ApplicationCommandOptionType,
    type Command,
    commands as registeredCommands,
    findOption,
    registerCommand,
    unregisterCommand
} from "../../api/commands";
import { createStore } from "../../api/dataStore";
import { Devs } from "../../utils/constants";
import { Logger } from "../../utils/logger";
import { definePlugin } from "../../utils/types";

interface Tag {
    name: string;
    message: string;
}

const logger = new Logger("CustomCommands", "#f4b8e4");
const store = createStore("CustomCommands");
const tags = new Map<string, Tag>();
const placeholder = /{{\s*([\w-]+)(?:\s*=\s*([^}]+))?\s*}}/g;

function tagOptions(message: string): Command["options"] {
    const found = new Map<string, string | undefined>();
    for (const match of message.matchAll(placeholder)) {
        if (!found.has(match[1])) found.set(match[1], match[2]?.trim());
    }
    return [...found].map(([name, fallback]) => ({
        name: name.toLowerCase(),
        description: `${name} değeri`,
        type: ApplicationCommandOptionType.STRING,
        required: fallback == null
    }));
}

function renderTag(tag: Tag, args: Array<{ name: string; value: any }>): string {
    return tag.message.replace(placeholder, (full, name: string, fallback?: string) =>
        findOption(args, name.toLowerCase(), fallback?.trim() ?? full)
    ).replaceAll("\\n", "\n");
}

function registerTag(tag: Tag): void {
    registerCommand({
        name: tag.name,
        description: `Özel komut: ${tag.name}`,
        options: tagOptions(tag.message),
        execute: args => ({ content: renderTag(tag, args) })
    }, "CustomCommands");
}

async function saveTags(): Promise<void> {
    await store.set("tags", [...tags.values()]);
}

const managementCommands: Command[] = [
    {
        name: "tag-create",
        description: "Kalıcı özel slash komutu oluşturur",
        options: [
            { name: "name", description: "Komut adı", type: ApplicationCommandOptionType.STRING, required: true },
            { name: "message", description: "Komut çıktısı; {{ad}} ile argüman eklenebilir", type: ApplicationCommandOptionType.STRING, required: true }
        ],
        async execute(args) {
            const name = findOption(args, "name", "").trim().toLowerCase();
            const message = findOption(args, "message", "");
            if (!/^[a-z0-9_-]{1,32}$/.test(name)) return { content: "Komut adı 1-32 karakter olmalı ve yalnızca a-z, 0-9, _ veya - içermeli." };
            if (tags.has(name) || registeredCommands.some(command => command.name === name)) return { content: `/${name} zaten kullanılıyor.` };

            const tag = { name, message };
            tags.set(name, tag);
            registerTag(tag);
            await saveTags();
            return { content: `/${name} özel komutu oluşturuldu.` };
        }
    },
    {
        name: "tag-delete",
        description: "Özel slash komutunu siler",
        options: [{ name: "name", description: "Silinecek komut", type: ApplicationCommandOptionType.STRING, required: true }],
        async execute(args) {
            const name = findOption(args, "name", "").trim().toLowerCase();
            if (!tags.delete(name)) return { content: `/${name} adlı özel komut bulunamadı.` };
            unregisterCommand(name);
            await saveTags();
            return { content: `/${name} silindi.` };
        }
    },
    {
        name: "tag-list",
        description: "Özel slash komutlarını listeler",
        execute: () => ({
            content: tags.size
                ? [...tags.values()].map(tag => `/${tag.name} — ${tag.message.slice(0, 80)}`).join("\n")
                : "Henüz özel komut yok. /tag-create ile oluşturabilirsin."
        })
    }
];

export default definePlugin({
    name: "CustomCommands",
    description: "Kalıcı ve argüman destekli özel slash komutları oluşturur",
    authors: [Devs.Berk],
    tags: ["komut", "özelleştirme"],
    dependencies: ["CommandsAPI"],
    commands: managementCommands,

    async start() {
        const saved = await store.get<Tag[]>("tags");
        if (!Array.isArray(saved)) return;

        for (const tag of saved) {
            if (!/^[a-z0-9_-]{1,32}$/.test(tag?.name) || typeof tag?.message !== "string") continue;
            if (registeredCommands.some(command => command.name === tag.name)) {
                logger.warn(`/${tag.name} adı başka bir komut tarafından kullanılıyor; özel komut yüklenmedi.`);
                continue;
            }
            tags.set(tag.name, tag);
            registerTag(tag);
        }
    },

    stop() {
        for (const name of tags.keys()) unregisterCommand(name);
        tags.clear();
    }
});
