/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { addServerListElement, removeServerListElement } from "../../api/serverList";
import { Devs } from "../../utils/constants";
import { Logger } from "../../utils/logger";
import { definePlugin } from "../../utils/types";
import { getFluxDispatcher, GuildStore } from "../../webpack/common";
import { findStoreLazy } from "../../webpack/lazy";

const logger = new Logger("ReadAllNotificationsButton", "#a6d189");
const GuildChannelStore = findStoreLazy("GuildChannelStore");
const ThreadStore = findStoreLazy("ActiveJoinedThreadsStore");
const ReadStateStore = findStoreLazy("ReadStateStore");

function markAllRead(): void {
    try {
        const channels: Array<{ channelId: string; messageId: string; readStateType: number }> = [];

        for (const guild of Object.values<any>(GuildStore?.getGuilds?.() ?? {})) {
            const grouped = GuildChannelStore?.getChannels?.(guild.id) ?? {};
            const regular = [...(grouped.SELECTABLE ?? []), ...(grouped.VOCAL ?? [])];
            const threads = Object.values<any>(ThreadStore?.getActiveJoinedThreadsForGuild?.(guild.id) ?? {})
                .flatMap(group => Object.values<any>(group));

            for (const entry of [...regular, ...threads]) {
                const channelId = entry?.channel?.id ?? entry?.id;
                if (!channelId || !ReadStateStore?.hasUnread?.(channelId)) continue;

                channels.push({
                    channelId,
                    messageId: ReadStateStore.lastMessageId(channelId),
                    readStateType: 0
                });
            }
        }

        if (!channels.length) return;
        getFluxDispatcher()?.dispatch?.({ type: "BULK_ACK", context: "APP", channels });
    } catch (err) {
        logger.warn("Bildirimler topluca okunmuş işaretlenemedi.", err);
    }
}

const ReadAllButton = () => (
    <button
        type="button"
        onClick={markAllRead}
        title="Tüm sunucu bildirimlerini okundu işaretle"
        style={{
            width: 44,
            margin: "4px 6px",
            padding: "4px 2px",
            border: 0,
            borderRadius: 6,
            cursor: "pointer",
            color: "var(--interactive-normal)",
            background: "var(--background-mod-normal)"
        }}
    >
        Oku
    </button>
);

export default definePlugin({
    name: "ReadAllNotificationsButton",
    description: "Tüm sunucu bildirimlerini tek düğmeyle okundu işaretler",
    authors: [Devs.Berk],
    tags: ["bildirim", "kısayol"],
    dependencies: ["ServerListAPI"],
    requiresRestart: false,

    renderButton: () => <ReadAllButton />,

    start() {
        addServerListElement("above", "ReadAllNotificationsButton", this.renderButton);
    },

    stop() {
        removeServerListElement("above", "ReadAllNotificationsButton");
    }
});
