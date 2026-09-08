/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { getRawSettings, subscribeToSettings } from "../../api/settings";
import { Logger } from "../../utils/logger";
import { ChannelStore, getFluxDispatcher, MessageStore, UserStore } from "../../webpack/common";
import { LocalMessageHistory, type MessageContext } from "./history";
import { settings } from "./settings";

const logger = new Logger("MessageLogger", "#a6d189");
const LOCAL_PURGE = Symbol("MessageLogger local purge");
let active = false;
let unsubscribe: (() => void) | undefined;
let accountId: string | undefined;

export const history = new LocalMessageHistory(entry => {
    queueMicrotask(() => {
        // Aynı kimlik bu arada yeniden kaydedildiyse eski temizleme onu silmesin.
        if (history.get(entry.channelId, entry.id)) return;
        try {
            getFluxDispatcher()?.dispatch({
                type: "MESSAGE_DELETE",
                channelId: entry.channelId,
                id: entry.id,
                mcordLoggerPurge: LOCAL_PURGE
            });
        } catch {
            logger.warn("Yerel silinmiş mesaj temizlenemedi; kanal yeniden yüklenince temizlenir.");
        }
    });
});

function context(message: any): MessageContext {
    const channel = ChannelStore?.getChannel?.(message.channel_id);
    return { userId: UserStore?.getCurrentUser?.()?.id, guildId: channel?.guild_id, parentId: channel?.parent_id };
}

export function startLogging(): void {
    // Eski sürümdeki kullanıcı tercihinin yeni logDeletes adı altında korunması.
    const previous = getRawSettings().plugins.MessageLogger;
    if (previous?.logDeletes === undefined && typeof previous?.keepDeletedMessages === "boolean") {
        settings.store.logDeletes = previous.keepDeletedMessages;
    }
    active = true;
    accountId = UserStore?.getCurrentUser?.()?.id;
    unsubscribe = subscribeToSettings(path => {
        if (!path.startsWith("plugins.MessageLogger.")) return;
        history.trim(settings.store.maxEntries);
        history.refresh();
    });
}

export function stopLogging(): void {
    active = false;
    unsubscribe?.();
    unsubscribe = undefined;
    accountId = undefined;
    history.clear();
}

export function resetAccount(): void {
    const next = UserStore?.getCurrentUser?.()?.id;
    if (accountId !== next) history.clear();
    accountId = next;
}

/** null: özgün Discord işleyicisi devam etsin; cache: yalnız bu store için commit. */
export function handleDelete(cache: any, event: any): any {
    // `mcordLoggerPurge`: kendi temizleme dispatch'imiz. `mlDeleted`: başka bir
    // plugin (MessageClickActions) zaten silinmiş bir mesajı gerçekten kaldırmak
    // istiyor — ikisinde de yeniden kaydetme, Discord'un normal silmesi geçsin.
    if (!active || !cache) return null;
    if (event?.mcordLoggerPurge === LOCAL_PURGE || event?.mlDeleted === true) return null;
    try {
        if (typeof cache.get !== "function" || typeof cache.remove !== "function") return null;
        const ids: string[] = Array.isArray(event.ids) ? event.ids : [event.id];
        let result = cache;
        for (const id of ids) {
            if (typeof id !== "string") continue;
            const message = cache.get(id);
            if (!message) continue;
            if (!history.recordDelete(message, settings.store, context(message))) {
                history.forget(message.channel_id, id, false);
                result = result.remove(id);
            } else if (typeof result.update === "function") {
                // Mesajı görünür bırak + `deleted` işaretle → satır kırmızı + çöp
                // ikonu. MessageRecord Immutable, `.set` yeni
                // kayıt döndürüyor.
                result = result.update(id, (record: any) =>
                    typeof record?.set === "function" ? record.set("deleted", true) : record);
            }
        }
        return result;
    } catch {
        logger.warn("MessageStore silme biçimi desteklenmiyor; Discord'un normal silme işlemi kullanılacak.");
        return null;
    }
}

/** MessageStore'un özgün güncellemesine aynı nesneyi geri verir; mesaj göndermez. */
export function recordEdit(previous: any, update: any): any {
    if (!active) return previous;
    try {
        if (previous) history.recordEdit(previous, update, settings.store, context(previous));
    } catch {
        logger.warn("Düzenleme geçmişi alınamadı; mesajın normal güncellenmesi devam ediyor.");
    }
    return previous;
}

export function isDeletedMessage(message: any): boolean {
    return active && history.get(message?.channel_id, message?.id)?.deleted === true;
}

export function normalizeNonce(message: any): void {
    if (!active || !message?.nonce) return;
    try {
        if (message.author?.id === UserStore?.getCurrentUser?.()?.id) return;
        const previous = MessageStore?.getMessage?.(message.channel_id, String(message.nonce));
        if (previous?.state === "SENT" && previous.id !== message.id) delete message.nonce;
    } catch {
        logger.warn("Mesaj nonce çakışması denetlenemedi; mesaj normal işlenecek.");
    }
}
