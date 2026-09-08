/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import {
    ChannelStore,
    ComponentDispatch,
    GuildStore,
    i18n,
    MessageActions,
    SelectedChannelStore,
    SelectedGuildStore,
    UserProfileActions,
    UserStore
} from "../webpack/common";
import { runtimeHashMessageKey } from "./intlHash";

/** O an seçili sunucu (yoksa `null`). */
export function getCurrentGuild(): any {
    return GuildStore?.getGuild?.(SelectedGuildStore?.getGuildId?.()) ?? null;
}

/** O an açık kanal (yoksa `null`). */
export function getCurrentChannel(): any {
    return ChannelStore?.getChannel?.(SelectedChannelStore?.getChannelId?.()) ?? null;
}

/** Sunucu adından kısaltma (`"Cool Server"` → `"CS"`). */
export function getGuildAcronym(name: string): string {
    return String(name ?? "")
        .replace(/'s /g, " ")
        .replace(/\w+/g, word => word[0])
        .replace(/\s/g, "");
}

/**
 * Discord'un çevrilmiş bir mesajını anahtardan al (`getIntlMessage("CLOSE")`).
 * Anahtarlar hash'li — `runtimeHashMessageKey` ile çeviriyoruz.
 */
export function getIntlMessage(key: string, values?: Record<string, any>): any {
    try {
        const hashed = runtimeHashMessageKey(key);
        const msg = (i18n as any)?.t?.[hashed];
        if (msg == null) return key;
        return typeof msg === "function" ? msg(values) : (msg.format?.(values) ?? msg);
    } catch {
        return key;
    }
}

/** Kullanıcı profilini aç. */
export function openUserProfile(userId: string): void {
    const user = UserStore?.getUser?.(userId);
    (UserProfileActions as any)?.openUserProfileModal?.({ userId, guildId: getCurrentGuild()?.id }) ??
        (user && (UserProfileActions as any)?.open?.(userId));
}

/** Sohbet kutusuna metin ekle (imleç konumuna). */
export function insertTextIntoChatInputBox(text: string): void {
    (ComponentDispatch as any)?.dispatchToLastSubscribed?.("INSERT_TEXT", {
        rawText: text,
        plainText: text
    });
}

/** Bir kanala mesaj gönder (plugin'ler açıkça istediğinde). */
export function sendMessage(
    channelId: string,
    data: { content?: string; tts?: boolean;[k: string]: any },
    waitForChannelReady = true
): Promise<any> {
    const messageData = {
        content: "",
        invalidEmojis: [],
        validNonShortcutEmojis: [],
        tts: false,
        ...data
    };
    return (MessageActions as any).sendMessage(channelId, messageData, waitForChannelReady);
}
