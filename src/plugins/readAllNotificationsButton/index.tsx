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

// Sunucu şeridinde ayırıcı çizginin hemen altında, ince yatay bir dikdörtgen.
const ReadAllButton = () => (
    <div style={{ flex: "0 0 auto", display: "flex", justifyContent: "center", margin: "0 0 2px" }}>
        <button
            type="button"
            onClick={markAllRead}
            title="Tüm sunucu bildirimlerini okundu işaretle"
            aria-label="Tüm bildirimleri okundu işaretle"
            style={{
                width: 44,
                height: 18,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
                border: 0,
                borderRadius: 6,
                cursor: "pointer",
                color: "var(--interactive-normal, #b5bac1)",
                background: "var(--background-modifier-hover, rgba(255, 255, 255, .06))"
            }}
        >
            <svg width="20" height="12" viewBox="0 0 22 14" style={{ pointerEvents: "none" }}>
                <path
                    d="M1.5 7.5 5 11l7-8M10 10l1 1 7-8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        </button>
    </div>
);

export default definePlugin({
    name: "ReadAllNotificationsButton",
    description: "Tüm sunucu bildirimlerini tek düğmeyle okundu işaretler",
    authors: [Devs.Berk],
    tags: ["bildirim", "kısayol"],
    dependencies: ["ServerListAPI"],
    // ServerListAPI kod patch'i host'u memoize'lediği için canlı toggle'da
    // düğme görünmüyor — restart gerekiyor.
    requiresRestart: true,

    renderButton: () => <ReadAllButton />,

    start() {
        addServerListElement("below", "ReadAllNotificationsButton", this.renderButton);
    },

    stop() {
        removeServerListElement("below", "ReadAllNotificationsButton");
    }
});
