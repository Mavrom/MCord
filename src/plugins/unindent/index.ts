/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import type { MessageObject } from "../../api/messageEvents";
import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";
import { unindent } from "./unindent";

export default definePlugin({
    name: "Unindent",
    description: "Çok satırlı mesajlardaki gereksiz baştaki girintiyi gönderirken kaldırır",
    authors: [Devs.Berk],
    tags: ["mesaj", "kalite-yasam"],
    dependencies: ["MessageEventsAPI"],
    requiresRestart: false,

    onBeforeMessageSend(_channelId: string, message: MessageObject) {
        if (message.content) message.content = unindent(message.content);
    },

    onBeforeMessageEdit(_channelId: string, _messageId: string, message: MessageObject) {
        if (message.content) message.content = unindent(message.content);
    }
});
