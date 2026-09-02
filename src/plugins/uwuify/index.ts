/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { ApplicationCommandOptionType, type Command, findOption } from "../../api/commands";
import type { MessageObject } from "../../api/messageEvents";
import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { definePlugin, OptionType } from "../../utils/types";
import { uwuify } from "./uwu";

const settings = definePluginSettings({
    everyMessage: {
        type: OptionType.BOOLEAN,
        description: "Gönderdiğin HER mesajı uwu'la (dikkatli kullan)",
        default: false
    }
});

const commands: Command[] = [{
    name: "uwuify",
    description: "Metni uwu diline çevir",
    options: [{ name: "message", description: "Girdi", type: ApplicationCommandOptionType.STRING, required: true }],
    execute: args => ({ content: uwuify(findOption(args, "message", "")) })
}];

export default definePlugin({
    name: "Uwuify",
    description: "`/uwuify` komutu — ve isteğe bağlı olarak tüm mesajları uwu'lar",
    authors: [Devs.Berk],
    tags: ["komut", "eglence", "mesaj"],
    settings,
    dependencies: ["CommandsAPI", "MessageEventsAPI"],
    commands,

    onBeforeMessageSend(_channelId: string, message: MessageObject) {
        if (settings.store.everyMessage && message.content) message.content = uwuify(message.content);
    }
});
