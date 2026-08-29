/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import type { MessageObject } from "../../api/messageEvents";
import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { definePlugin, OptionType } from "../../utils/types";
import { applyRules, type Rule, validateRules } from "./replace";

const settings = definePluginSettings({
    rules: {
        type: OptionType.STRING,
        description: "Kural listesi (JSON): [{ \"find\": \"...\", \"replace\": \"...\", \"isRegex\": false }]",
        default: "[]",
        isValid: validateRules
    },
    skipCodeBlocks: {
        type: OptionType.BOOLEAN,
        description: "Kod bloklarının içinde değiştirme yapma",
        default: true
    }
});

export default definePlugin({
    name: "TextReplace",
    description: "Gönderdiğin mesajlarda otomatik metin değiştirme kuralları uygular",
    authors: [Devs.MCord],
    tags: ["mesaj", "kalite-yasam"],
    settings,

    // Patch yok: tamamen `onBeforeMessageSend` üzerinden çalışıyor (plan §5.1).
    dependencies: ["MessageEventsAPI"],
    requiresRestart: false,

    onBeforeMessageSend(_channelId: string, message: MessageObject) {
        if (!message.content) return;

        let rules: Rule[];
        try {
            rules = JSON.parse(settings.store.rules) as Rule[];
        } catch {
            return;
        }

        message.content = applyRules(message.content, rules, settings.store.skipCodeBlocks);
    }
});
