/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { type Command, findOption } from "../../api/commands";
import { showNotification } from "../../api/notifications";
import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { Logger } from "../../utils/logger";
import { definePlugin, OptionType, StartAt } from "../../utils/types";
import { getFluxDispatcher, MessageStore, UserStore } from "../../webpack/common";

const logger = new Logger("MessageLogger", "#a6d189");

export interface LoggedMessage {
    kind: "deleted" | "edited";
    channelId: string;
    messageId: string;
    authorId: string;
    authorName: string;
    content: string;
    previousContent?: string;
    at: number;
}

const settings = definePluginSettings({
    keepDeletedMessages: {
        type: OptionType.BOOLEAN,
        description: "Silinen mesajları sohbette bırak (silme olayı yutulur)",
        default: true
    },
    logEdits: {
        type: OptionType.BOOLEAN,
        description: "Düzenlemeleri de kaydet",
        default: true
    },
    ignoreSelf: {
        type: OptionType.BOOLEAN,
        description: "Kendi mesajlarını kaydetme",
        default: true
    },
    maxEntries: {
        type: OptionType.SLIDER,
        description: "Bellekte tutulacak en fazla kayıt",
        markers: [100, 250, 500, 1000, 2500],
        default: 500,
        stickToMarkers: true
    }
});

const log: LoggedMessage[] = [];

export function getLog(): readonly LoggedMessage[] {
    return log;
}

export function clearLog(): void {
    log.length = 0;
}

function push(entry: LoggedMessage): void {
    log.push(entry);
    while (log.length > settings.store.maxEntries) log.shift();
}

const logCommand: Command = {
    name: "mcord-log",
    description: "Kaydedilen silinmiş/düzenlenmiş mesajları gösterir",
    options: [],
    execute(args) {
        const limit = findOption<number>(args, "adet", 10);
        const recent = log.slice(-limit).reverse();

        if (recent.length === 0) {
            showNotification({
                title: "Mesaj kaydı boş",
                body: "Bu oturumda kaydedilen silinmiş veya düzenlenmiş mesaj yok.",
                color: "#8caaee"
            });
            return;
        }

        const text = recent
            .map(entry => `- **${entry.authorName}** (${entry.kind === "deleted" ? "silindi" : "düzenlendi"}): `
                + (entry.kind === "edited" ? `~~${entry.previousContent}~~ → ${entry.content}` : entry.content))
            .join("\n");

        return { content: text };
    }
};

export default definePlugin({
    name: "MessageLogger",
    description: "Silinen ve düzenlenen mesajları oturum boyunca kaydeder",
    authors: [Devs.MCord],
    tags: ["mesaj", "kalite-yasam"],
    settings,
    dependencies: ["CommandsAPI"],
    commands: [logCommand],

    // Kod patch'i yok: Flux olayları ve dispatcher fonksiyon patch'i (plan §5.1, §6.6).
    requiresRestart: false,
    startAt: StartAt.WebpackReady,

    /**
     * Silme olayını yutmak için `dispatch`'i sarıyoruz. Flux handler'ları olay
     * *işlendikten sonra* çalıştığı için mesajı store'da tutmanın tek yolu bu.
     */
    start() {
        const Dispatcher = getFluxDispatcher();
        if (!Dispatcher) {
            logger.error("FluxDispatcher bulunamadı.");
            return;
        }

        this.patcher.instead(Dispatcher, "dispatch", (self, args, original) => {
            const event = args[0];

            if (event?.type === "MESSAGE_DELETE" && this.recordDelete(event)) {
                if (settings.store.keepDeletedMessages) return undefined;
            }

            return original.apply(self, args);
        });
    },

    stop() {
        clearLog();
    },

    flux: {
        MESSAGE_UPDATE(event: any) {
            if (!settings.store.logEdits) return;

            const message = event?.message;
            if (!message?.id || message.content == null) return;

            const previous = MessageStore?.getMessage?.(message.channel_id, message.id);

            if (previous?.content === message.content) return;
            if (settings.store.ignoreSelf && isSelf(message.author?.id)) return;

            push({
                kind: "edited",
                channelId: message.channel_id,
                messageId: message.id,
                authorId: message.author?.id ?? "?",
                authorName: message.author?.username ?? "?",
                content: message.content,
                previousContent: previous?.content ?? "",
                at: Date.now()
            });
        }
    },

    recordDelete(event: any): boolean {
        const message = MessageStore?.getMessage?.(event.channelId, event.id);

        if (!message) return false;
        if (settings.store.ignoreSelf && isSelf(message.author?.id)) return false;

        push({
            kind: "deleted",
            channelId: event.channelId,
            messageId: event.id,
            authorId: message.author?.id ?? "?",
            authorName: message.author?.username ?? "?",
            content: message.content ?? "",
            at: Date.now()
        });

        return true;
    }
});

function isSelf(authorId: string | undefined): boolean {
    if (!authorId) return false;
    return UserStore?.getCurrentUser?.()?.id === authorId;
}
