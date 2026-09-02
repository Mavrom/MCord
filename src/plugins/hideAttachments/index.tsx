/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { createStore } from "../../api/dataStore";
import { updateMessage } from "../../api/messageUpdater";
import { Devs } from "../../utils/constants";
import { Logger } from "../../utils/logger";
import { definePlugin } from "../../utils/types";
import { ChannelStore } from "../../webpack/common";

const logger = new Logger("HideAttachments", "#f4b8e4");
const store = createStore("HideAttachments");
const hidden = new Set<string>();

function hasMedia(message: any): boolean {
    return [message?.attachments, message?.embeds, message?.stickerItems, message?.components]
        .some(items => Array.isArray(items) && items.length > 0);
}

async function toggle(message: any): Promise<void> {
    if (!message?.id || !message?.channel_id) return;
    if (!hidden.delete(message.id)) hidden.add(message.id);
    if (!await store.set("messageIds", [...hidden])) logger.warn("Gizli medya listesi kaydedilemedi.");
    updateMessage(message.channel_id, message.id);
}

function MediaIcon() {
    return <svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2ZM5 5h14v9.6l-3.2-3.2a2 2 0 0 0-2.8 0l-2 2-1.2-1.2a2 2 0 0 0-2.8 0l-2 2V5Zm0 12 3.4-3.4 1.2 1.2a2 2 0 0 0 2.8 0l2-2 4.6 4.6V19H5v-2Z" /></svg>;
}

export default definePlugin({
    name: "HideAttachments",
    description: "Seçilen mesajların eklerini, gömmelerini, çıkartmalarını ve bileşenlerini gizler",
    authors: [Devs.Berk],
    tags: ["mesaj", "görünüm"],
    dependencies: ["MessageAccessoriesAPI", "MessagePopoverAPI", "MessageUpdaterAPI"],

    patches: [{
        find: "this.renderAttachments(",
        reason: "Discord medya çizicileri mesaj görünürlüğünü değiştirmek için ayrı bir kanca sunmuyor.",
        all: true,
        replacement: {
            match: /(?<=\i=)this\.render(Attachments|Embeds|StickersAccessories|ComponentAccessories)\((\i)\)/g,
            replace: "$self.shouldHide($2?.id)?null:$&"
        }
    }],

    async start() {
        const saved = await store.get<string[]>("messageIds");
        if (Array.isArray(saved)) for (const id of saved) hidden.add(id);
    },

    stop() {
        hidden.clear();
    },

    shouldHide(messageId: string): boolean {
        return hidden.has(messageId);
    },

    messagePopoverButton(message: any) {
        const snapshots = Array.isArray(message?.messageSnapshots) ? message.messageSnapshots : [];
        if (!hasMedia(message) && !snapshots.some((snapshot: any) => hasMedia(snapshot?.message))) return null;
        return {
            label: hidden.has(message.id) ? "Medyayı göster" : "Medyayı gizle",
            icon: MediaIcon,
            message,
            channel: ChannelStore?.getChannel?.(message.channel_id),
            onClick: () => void toggle(message)
        };
    },

    renderMessageAccessory(props: Record<string, any>) {
        return hidden.has(props?.message?.id)
            ? <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}>Medya gizlendi</div>
            : null;
    }
});
