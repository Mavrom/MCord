/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { definePlugin, OptionType } from "../../utils/types";
import { ChannelStore, getFluxDispatcher, MessageStore, RelationshipStore, SelectedChannelStore, UserStore } from "../../webpack/common";
import { findByKeys } from "../../webpack/finder";

const settings = definePluginSettings({
    shouldMention: { type: OptionType.BOOLEAN, description: "Hızlı yanıtta kullanıcıdan bahset", default: true },
    ignoreBlocked: { type: OptionType.BOOLEAN, description: "Engellenen kullanıcıların mesajlarını atla", default: true }
});

let replying: string | null = null;
let editing: string | null = null;

function messages(edit: boolean): any[] {
    const channelId = SelectedChannelStore?.getChannelId?.();
    const collection = MessageStore?.getMessages?.(channelId);
    const list = collection?._array ?? collection?.toArray?.() ?? [];
    const me = UserStore?.getCurrentUser?.()?.id;
    return list.filter((message: any) =>
        !message.deleted
        && (!edit || message.author?.id === me)
        && (!settings.store.ignoreBlocked || !RelationshipStore?.isBlocked?.(message.author?.id))
    );
}

function next(list: any[], current: string | null, up: boolean): any | null {
    if (!list.length) return null;
    if (!current) return list[list.length - 1];
    const index = list.findIndex(message => message.id === current);
    if (index < 0) return list[list.length - 1];
    return list[index + (up ? -1 : 1)] ?? null;
}

function focusInput(): void {
    findByKeys<any>("dispatchToLastSubscribed")?.dispatchToLastSubscribed?.("TEXTAREA_FOCUS");
}

function keydown(event: KeyboardEvent): void {
    if (!event.ctrlKey || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
    event.preventDefault();
    const up = event.key === "ArrowUp";
    const dispatcher = getFluxDispatcher();
    const channelId = SelectedChannelStore?.getChannelId?.();

    if (event.shiftKey) {
        const message = next(messages(true), editing, up);
        editing = message?.id ?? null;
        dispatcher?.dispatch?.(message ? {
            type: "MESSAGE_START_EDIT", channelId: message.channel_id, messageId: message.id, content: message.content
        } : { type: "MESSAGE_END_EDIT", channelId });
    } else {
        const message = next(messages(false), replying, up);
        replying = message?.id ?? null;
        const channel = message ? ChannelStore?.getChannel?.(message.channel_id) : null;
        dispatcher?.dispatch?.(message ? {
            type: "CREATE_PENDING_REPLY", channel, message, shouldMention: settings.store.shouldMention, showMentionToggle: true
        } : { type: "DELETE_PENDING_REPLY", channelId });
    }
    focusInput();
}

export default definePlugin({
    name: "QuickReply",
    description: "Ctrl+Yukarı/Aşağı ile yanıt, Ctrl+Shift+Yukarı/Aşağı ile düzenleme seçer",
    authors: [Devs.Berk],
    tags: ["mesaj", "kısayol"],
    settings,
    requiresRestart: false,

    start() {
        document.addEventListener("keydown", keydown);
    },

    stop() {
        document.removeEventListener("keydown", keydown);
        replying = editing = null;
    }
});
