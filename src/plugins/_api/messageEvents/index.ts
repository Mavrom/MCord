/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { _handleClick, _handlePreEdit, _handlePreSend } from "../../../api/messageEvents";
import { Devs } from "../../../utils/constants";
import { Logger } from "../../../utils/logger";
import { definePlugin } from "../../../utils/types";
import { byKeys } from "../../../webpack/filters";
import { waitFor, waitForStore } from "../../../webpack/lazy";

const logger = new Logger("MessageEventsAPI", "#f4b8e4");

export default definePlugin({
    name: "MessageEventsAPI",
    description: "Mesaj gönderme, düzenleme ve tıklama olaylarını plugin'lere açar",
    authors: [Devs.MCord],
    required: true,

    start() {
        this.cancelActionsWait = waitFor(byKeys(["sendMessage", "editMessage"]), MessageActions => {
            if (typeof MessageActions?.sendMessage !== "function" || typeof MessageActions?.editMessage !== "function") {
                logger.warn("MessageActions bulundu ancak beklenen fonksiyonlar eksik; patch atlandı.");
                return;
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
        });

        this.cancelMessageStoreWait = waitForStore("MessageStore", store => { this.messageStore = store; });
        this.cancelChannelStoreWait = waitForStore("ChannelStore", store => { this.channelStore = store; });

        document.addEventListener("click", this.onDocumentClick, true);
    },

    stop() {
        document.removeEventListener("click", this.onDocumentClick, true);
        this.cancelActionsWait?.();
        this.cancelMessageStoreWait?.();
        this.cancelChannelStoreWait?.();
        this.cancelActionsWait = undefined;
        this.cancelMessageStoreWait = undefined;
        this.cancelChannelStoreWait = undefined;
        this.messageStore = null;
        this.channelStore = null;
    },

    cancelActionsWait: undefined as (() => void) | undefined,
    cancelMessageStoreWait: undefined as (() => void) | undefined,
    cancelChannelStoreWait: undefined as (() => void) | undefined,
    messageStore: null as any,
    channelStore: null as any,

    onDocumentClick(event: MouseEvent) {
        const target = event.target as HTMLElement | null;
        const messageElement = target?.closest?.("[class*='message'][id^='chat-messages-']");
        if (!messageElement) return;

        // `chat-messages-<channelId>-<messageId>`
        const parts = messageElement.id.split("-");
        const messageId = parts.at(-1);
        const channelId = parts.at(-2);
        if (!messageId || !channelId) return;

        const message = this.messageStore?.getMessage?.(channelId, messageId);
        const channel = this.channelStore?.getChannel?.(channelId);
        if (!message || !channel) return;

        _handleClick(message, channel, event);
    }
});
