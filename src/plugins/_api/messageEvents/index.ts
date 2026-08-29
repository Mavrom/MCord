/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { _handleClick, _handlePreEdit, _handlePreSend } from "../../../api/messageEvents";
import { Devs } from "../../../utils/constants";
import { definePlugin } from "../../../utils/types";
import { findByKeys } from "../../../webpack/finder";

export default definePlugin({
    name: "MessageEventsAPI",
    description: "Mesaj gönderme, düzenleme ve tıklama olaylarını plugin'lere açar",
    authors: [Devs.MCord],
    required: true,

    // Kod patch'i yok: hepsi fonksiyon patch'i ile çözülüyor (plan §5.1).
    start() {
        const MessageActions = findByKeys("sendMessage", "editMessage");
        if (!MessageActions) {
            throw new Error("MessageActions modülü bulunamadı.");
        }

        this.patcher.instead(MessageActions, "sendMessage", (self, args, original) => {
            const [channelId, message] = args;
            return Promise.resolve(_handlePreSend(channelId, message, args[2]))
                .then(() => original.apply(self, args));
        });

        this.patcher.instead(MessageActions, "editMessage", (self, args, original) => {
            const [channelId, messageId, message] = args;
            return Promise.resolve(_handlePreEdit(channelId, messageId, message))
                .then(() => original.apply(self, args));
        });

        const MessageStore = findByKeys("getMessage", "getMessages");
        if (MessageStore) this.messageStore = MessageStore;

        document.addEventListener("click", this.onDocumentClick, true);
    },

    stop() {
        document.removeEventListener("click", this.onDocumentClick, true);
    },

    messageStore: null as any,

    onDocumentClick(event: MouseEvent) {
        const target = event.target as HTMLElement | null;
        const messageElement = target?.closest?.("[class*='message'][id^='chat-messages-']");
        if (!messageElement) return;

        // `chat-messages-<channelId>-<messageId>`
        const parts = messageElement.id.split("-");
        const messageId = parts.at(-1);
        const channelId = parts.at(-2);
        if (!messageId || !channelId) return;

        _handleClick({ id: messageId }, { id: channelId }, event);
    }
});
