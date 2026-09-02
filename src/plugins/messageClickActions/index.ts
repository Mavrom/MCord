/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { Logger } from "../../utils/logger";
import { definePlugin, OptionType } from "../../utils/types";
import { getFluxDispatcher, UserStore } from "../../webpack/common";
import { byKeys } from "../../webpack/filters";
import { find } from "../../webpack/finder";

const logger = new Logger("MessageClickActions", "#a6d189");
let deleteHeld = false;

const settings = definePluginSettings({
    deleteWithBackspace: {
        type: OptionType.BOOLEAN,
        description: "Backspace basılıyken kendi mesajına tıklayınca sil",
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

function getMessageActions(): any {
    return find(byKeys(["deleteMessage", "startEditMessage"]), { silent: true });
}

export default definePlugin({
    name: "MessageClickActions",
    description: "Çift tıklamayla düzenleme/yanıtlama ve Backspace+tıklamayla silme ekler",
    authors: [Devs.Berk],
    tags: ["mesaj", "kısayol"],
    dependencies: ["MessageEventsAPI"],
    settings,
    requiresRestart: false,

    start() {
        document.addEventListener("keydown", this.onKeyDown);
        document.addEventListener("keyup", this.onKeyUp);
        window.addEventListener("blur", this.onBlur);
    },

    stop() {
        document.removeEventListener("keydown", this.onKeyDown);
        document.removeEventListener("keyup", this.onKeyUp);
        window.removeEventListener("blur", this.onBlur);
        deleteHeld = false;
    },

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

        const currentUserId = UserStore?.getCurrentUser?.()?.id;
        const isOwnMessage = message?.author?.id === currentUserId;
        const actions = getMessageActions();

        if (deleteHeld) {
            if (!settings.store.deleteWithBackspace || !isOwnMessage || message?.deleted) return;
            if (typeof actions?.deleteMessage !== "function") {
                logger.warn("Mesaj silme eylemi bulunamadı.");
                return;
            }
            actions.deleteMessage(channel.id, message.id);
            event.preventDefault();
            return;
        }

        if (event.detail < 2) return;
        if (settings.store.requireModifier && !event.ctrlKey && !event.shiftKey) return;

        if (isOwnMessage) {
            if (!settings.store.doubleClickToEdit || message?.state !== "SENT") return;
            if (typeof actions?.startEditMessage !== "function") {
                logger.warn("Mesaj düzenleme eylemi bulunamadı.");
                return;
            }
            actions.startEditMessage(channel.id, message.id, message.content);
            event.preventDefault();
            return;
        }

        if (!settings.store.doubleClickToReply || message?.deleted) return;
        const dispatcher = getFluxDispatcher();
        if (typeof dispatcher?.dispatch !== "function") {
            logger.warn("Yanıt eylemi için FluxDispatcher bulunamadı.");
            return;
        }

        dispatcher.dispatch({
            type: "CREATE_PENDING_REPLY",
            channel,
            message,
            shouldMention: !event.shiftKey,
            showMentionToggle: channel.guild_id != null
        });
    }
});
