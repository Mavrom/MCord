/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import type { MessageObject } from "../../api/messageEvents";
import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { definePlugin, OptionType } from "../../utils/types";
import { cleanText, codeRanges } from "./clean";

const settings = definePluginSettings({
    skipCodeBlocks: {
        type: OptionType.BOOLEAN,
        description: "Kod bloklarının içindeki bağlantılara dokunma",
        default: true
    }
});

function scrub(message: MessageObject): void {
    if (!message.content) return;
    const skip = settings.store.skipCodeBlocks ? codeRanges(message.content) : [];
    message.content = cleanText(message.content, skip);
}

export default definePlugin({
    name: "ClearURLs",
    description: "Gönderdiğin bağlantılardan izleme parametrelerini (utm_*, fbclid, si …) siler",
    authors: [Devs.Berk],
    tags: ["gizlilik", "mesaj"],
    settings,
    dependencies: ["MessageEventsAPI"],
    requiresRestart: false,

    onBeforeMessageSend(_channelId: string, message: MessageObject) {
        scrub(message);
    },

    onBeforeMessageEdit(_channelId: string, _messageId: string, message: MessageObject) {
        scrub(message);
    }
});
