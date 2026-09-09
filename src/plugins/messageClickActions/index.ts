/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { Logger } from "../../utils/logger";
import { definePlugin, OptionType } from "../../utils/types";
import {
    getFluxDispatcher,
    MessageTypeSets,
    PermissionsBits,
    PermissionStore,
    UserStore
} from "../../webpack/common";
import { findByPropsLazy } from "../../webpack/lazy";

const logger = new Logger("MessageClickActions", "#a6d189");
let deleteHeld = false;

const EPHEMERAL = 64;
/** yetki bitleri (bulunamazsa sabit). */
function bit(name: "MANAGE_MESSAGES" | "SEND_MESSAGES", fallback: bigint): bigint {
    const value = (PermissionsBits as any)?.[name];
    return typeof value === "bigint" ? value : fallback;
}

const settings = definePluginSettings({
    deleteWithBackspace: {
        type: OptionType.BOOLEAN,
        description: "Backspace basılıyken tıklayınca sil (kendi mesajın ya da silme yetkin olan yerde başkasınınki)",
        default: true
    },
    doubleClickToEdit: {
        type: OptionType.BOOLEAN,
        description: "Kendi mesajına çift tıklayınca düzenle",
        default: true
    },
    doubleClickToReply: {
        type: OptionType.BOOLEAN,
        description: "Başkasının mesajına çift tıklayınca yanıtla",
        default: true
    },
    requireModifier: {
        type: OptionType.BOOLEAN,
        description: "Çift tıklama eylemleri için Shift veya Ctrl iste",
        default: false
    }
});

/**
 * Tembel + reporter'a kayitli. Eski surum her tikta `find(...,{silent:true})`
 * calistiriyordu: hem tum cache'i her seferinde tariyor hem de kirildiginda
 * CI'da gorunmuyordu.
 */
const MessageActions = findByPropsLazy("deleteMessage", "startEditMessage") as any;

/** Bu kanalda mesaj silme yetkin var mı (kendi mesajın veya MANAGE_MESSAGES). */
function canDelete(isOwn: boolean, channel: any): boolean {
    if (isOwn) return true;
    try {
        return PermissionStore?.can?.(bit("MANAGE_MESSAGES", 1n << 13n), channel) === true;
    } catch {
        return false;
    }
}

export default definePlugin({
    name: "MessageClickActions",
    description: "Çift tıklamayla düzenleme/yanıtlama ve Backspace+tıklamayla silme",
    authors: [Devs.Berk],
    tags: ["mesaj", "kısayol"],
    dependencies: ["MessageEventsAPI"],
    settings,
    requiresRestart: false,

    start() {
        this.boundKeyDown = this.onKeyDown.bind(this);
        this.boundKeyUp = this.onKeyUp.bind(this);
        this.boundBlur = this.onBlur.bind(this);
        document.addEventListener("keydown", this.boundKeyDown);
        document.addEventListener("keyup", this.boundKeyUp);
        window.addEventListener("blur", this.boundBlur);
    },

    stop() {
        document.removeEventListener("keydown", this.boundKeyDown!);
        document.removeEventListener("keyup", this.boundKeyUp!);
        window.removeEventListener("blur", this.boundBlur!);
        deleteHeld = false;
    },

    boundKeyDown: undefined as ((e: KeyboardEvent) => void) | undefined,
    boundKeyUp: undefined as ((e: KeyboardEvent) => void) | undefined,
    boundBlur: undefined as (() => void) | undefined,

    onKeyDown(event: KeyboardEvent) {
        if (event.key === "Backspace") deleteHeld = true;
    },

    onKeyUp(event: KeyboardEvent) {
        if (event.key === "Backspace") deleteHeld = false;
    },

    onBlur() {
        deleteHeld = false;
    },

    onMessageClick(message: any, channel: any, event: MouseEvent) {
        const target = event.target as HTMLElement | null;
        if (target?.closest?.("a, button, input, textarea, [role='button']")) return;

        const myId = UserStore?.getCurrentUser?.()?.id;
        const isMe = message?.author?.id === myId;
        const actions = MessageActions;
        const dispatcher = getFluxDispatcher();

        // ── Backspace + tık: sil ────────────────────────────────────────────
        if (deleteHeld) {
            if (!settings.store.deleteWithBackspace) return;
            if (!canDelete(isMe, channel)) return;

            if (message?.deleted) {
                // Yerelde tutulan (MessageLogger) silinmiş mesajı gerçekten kaldır
                // (`mlDeleted` bayrağı).
                dispatcher?.dispatch?.({ type: "MESSAGE_DELETE", channelId: channel.id, id: message.id, mlDeleted: true });
            } else if (typeof actions?.deleteMessage === "function") {
                actions.deleteMessage(channel.id, message.id);
            } else {
                logger.warn("Mesaj silme eylemi bulunamadı.");
                return;
            }
            event.preventDefault();
            return;
        }

        // ── Çift tık: düzenle / yanıtla ─────────────────────────────────────
        if (event.detail < 2) return;
        if (settings.store.requireModifier && !event.ctrlKey && !event.shiftKey) return;
        if (channel.guild_id && PermissionStore?.can?.(bit("SEND_MESSAGES", 1n << 11n), channel) !== true) return;
        if (message?.deleted === true) return;

        if (isMe) {
            if (!settings.store.doubleClickToEdit || message?.state !== "SENT") return;
            if (typeof actions?.startEditMessage !== "function") {
                logger.warn("Mesaj düzenleme eylemi bulunamadı.");
                return;
            }
            actions.startEditMessage(channel.id, message.id, message.content);
            event.preventDefault();
            return;
        }

        if (!settings.store.doubleClickToReply) return;
        if (MessageTypeSets?.REPLYABLE && !MessageTypeSets.REPLYABLE.has(message.type)) return;
        if ((Number(message.flags ?? 0) & EPHEMERAL) !== 0) return;
        if (typeof dispatcher?.dispatch !== "function") {
            logger.warn("Yanıt eylemi için FluxDispatcher bulunamadı.");
            return;
        }

        dispatcher.dispatch({
            type: "CREATE_PENDING_REPLY",
            channel,
            message,
            shouldMention: !(event.shiftKey && !settings.store.requireModifier),
            showMentionToggle: channel.guild_id != null
        });
    }
});
