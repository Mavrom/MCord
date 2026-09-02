/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import type { ContextMenuPatch } from "../../api/contextMenu";
import { Devs } from "../../utils/constants";
import { definePlugin, StartAt } from "../../utils/types";
import { React } from "../../webpack/react";
import { messageLoggerPatches } from "./patches";
import { handleDelete, history, isDeletedMessage, normalizeNonce, recordEdit, resetAccount, startLogging, stopLogging } from "./runtime";
import { settings } from "./settings";
import { messageLoggerStyle } from "./style";
import { MessageEditMarker, MessageHistoryView } from "./view";

const messageMenu: ContextMenuPatch = (children, { message }) => {
    const entry = history.get(message?.channel_id, message?.id);
    if (!entry) return;
    if (entry.edits.length) {
        children.push({
            type: "mcord-message-history",
            id: "mcord-message-history",
            label: "Düzenleme geçmişini göster",
            action: () => document.getElementById(`mcord-history-${entry.channelId}-${entry.id}`)?.click()
        });
    }
    if (entry.deleted) {
        children.push({
            type: "mcord-message-highlight",
            id: "mcord-message-highlight",
            label: "Silinme vurgusunu aç/kapat",
            action: () => history.toggleHighlight(entry.channelId, entry.id)
        });
    }
    children.push({
        type: "mcord-message-forget",
        id: "mcord-message-forget",
        label: "Bu mesajın yerel geçmişini temizle",
        color: "danger",
        action: () => history.forget(entry.channelId, entry.id)
    });
};

const channelMenu: ContextMenuPatch = (children, { channel }) => {
    if (!channel?.id || !history.hasChannel(channel.id)) return;
    children.push({
        type: "mcord-channel-history-clear",
        id: "mcord-channel-history-clear",
        label: "Kanalın yerel mesaj geçmişini temizle",
        color: "danger",
        action: () => history.clear(channel.id)
    });
};

export default definePlugin({
    name: "MessageLogger",
    description: "Silinen mesajları yerelde görünür tutar; düzenleme geçmişini mesajın yanında gösterir",
    authors: [Devs.Berk],
    tags: ["mesaj", "kalite-yasam"],
    settings,
    dependencies: ["ContextMenuAPI", "MessageAccessoriesAPI"],
    startAt: StartAt.WebpackReady,
    requiresRestart: true,
    patches: messageLoggerPatches,
    managedStyle: messageLoggerStyle,
    contextMenus: {
        "message": messageMenu,
        "channel-context": channelMenu,
        "thread-context": channelMenu,
        "user-context": channelMenu,
        "gdm-context": channelMenu
    },
    start: startLogging,
    stop: stopLogging,
    flux: {
        LOGOUT: () => history.clear(),
        CONNECTION_OPEN: resetAccount,
        CHANNEL_DELETE: event => {
            const id = event.channel?.id ?? event.channelId;
            if (id) history.clear(id);
        },
        GUILD_DELETE: event => {
            const id = event.guild?.id ?? event.guildId;
            if (id) history.clear(undefined, id);
        }
    },
    renderMessageAccessory({ message }) {
        if (!message?.id || !message.channel_id) return null;
        return React.createElement(MessageHistoryView, { key: `${message.channel_id}:${message.id}`, channelId: message.channel_id, messageId: message.id });
    },
    handleDelete,
    recordEdit,
    isDeletedMessage,
    normalizeNonce,
    EditMarker: MessageEditMarker
});
