/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { type ContextMenuPatch } from "../../api/contextMenu";
import { Devs } from "../../utils/constants";
import { Logger } from "../../utils/logger";
import { definePlugin } from "../../utils/types";
import { ChannelStore } from "../../webpack/common";

const logger = new Logger("ViewRaw", "#f4b8e4");

function RawIcon() {
    return <svg width="20" height="20" viewBox="0 0 20 20"><path fill="currentColor" d="m7 3 1.4 1.4L2.8 10l5.6 5.6L7 17l-7-7 7-7Zm6 0 7 7-7 7-1.4-1.4 5.6-5.6-5.6-5.6L13 3Z" /></svg>;
}

function cleaned(value: any): any {
    const copy = JSON.parse(JSON.stringify(value));
    if (copy?.author) {
        delete copy.author.email;
        delete copy.author.phone;
        delete copy.author.mfaEnabled;
    }
    delete copy?.editHistory;
    return copy;
}

function view(value: any): void {
    try {
        const blob = new Blob([JSON.stringify(cleaned(value), null, 4)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank", "noopener,noreferrer");
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
        logger.warn("Ham veri açılamadı.", error);
    }
}

function menu(field: string): ContextMenuPatch {
    return (children, props) => {
        const value = props?.[field];
        if (!value) return;
        children.push({
            type: `mcord-view-raw-${field}`,
            id: `mcord-view-raw-${field}`,
            label: "Ham veriyi aç",
            action: () => view(value)
        });
    };
}

export default definePlugin({
    name: "ViewRaw",
    description: "Mesaj, kanal, sunucu ve kullanıcıların ham verisini açar",
    authors: [Devs.Berk],
    tags: ["geliştirici", "mesaj"],
    dependencies: ["ContextMenuAPI", "MessagePopoverAPI"],
    requiresRestart: false,

    contextMenus: {
        message: menu("message"),
        "channel-context": menu("channel"),
        "thread-context": menu("channel"),
        "guild-context": menu("guild"),
        "user-context": menu("user")
    },

    messagePopoverButton(message: any) {
        return {
            label: "Ham mesaj verisini aç",
            icon: RawIcon,
            message,
            channel: ChannelStore?.getChannel?.(message.channel_id),
            onClick: () => view(message),
            onContextMenu: (event: MouseEvent) => {
                event.preventDefault();
                void navigator.clipboard.writeText(message.content ?? "");
            }
        };
    }
});
