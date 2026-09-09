/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/*
 * Kanıtlanmış açık-kaynak istemcinin (Vencord) güncel `MessageEvents`
 * API'sinin portu.
 */

import { Logger } from "../utils/logger";
import { MessageStore } from "../webpack/common";

const logger = new Logger("Api:MessageEvents", "#f4b8e4");

export interface MessageObject {
    content: string;
    validNonShortcutEmojis: unknown[];
    invalidEmojis?: unknown[];
    tts?: boolean;
}

export interface SendMessageOptions {
    messageReference?: any;
    allowedMentions?: { parse: string[]; repliedUser: boolean; };
    location?: string;
    stickerIds?: string[];
    [key: string]: any;
}

export interface SendMessageProps {
    hasStickers?: boolean;
    hasAttachments?: boolean;
    content?: string;
    channel?: any;
    type?: any;
    [key: string]: any;
}

type Cancelable = void | { cancel: boolean; } | Promise<void | { cancel: boolean; }>;

export type SendListener = (
    channelId: string,
    message: MessageObject,
    options: SendMessageOptions,
    props: SendMessageProps
) => Cancelable;
export type EditListener = (channelId: string, messageId: string, message: MessageObject) => Cancelable;
export type ClickListener = (message: any, channel: any, event: MouseEvent) => void;

const sendListeners = new Set<SendListener>();
const editListeners = new Set<EditListener>();
const clickListeners = new Set<ClickListener>();

/** Gönderimden önce çalışır — mesaj düzenlenebilir, `{cancel:true}` iptal eder. */
export function addMessagePreSendListener(listener: SendListener): SendListener {
    sendListeners.add(listener);
    return listener;
}
export function removeMessagePreSendListener(listener: SendListener): boolean {
    return sendListeners.delete(listener);
}

/** Düzenleme uygulanmadan önce çalışır. */
export function addMessagePreEditListener(listener: EditListener): EditListener {
    editListeners.add(listener);
    return listener;
}
export function removeMessagePreEditListener(listener: EditListener): boolean {
    return editListeners.delete(listener);
}

export function addMessageClickListener(listener: ClickListener): ClickListener {
    clickListeners.add(listener);
    return listener;
}
export function removeMessageClickListener(listener: ClickListener): boolean {
    return clickListeners.delete(listener);
}

/** `MessageEventsAPI` patch'i tarafından çağrılır. `true` → gönderimi iptal et. */
export async function _handlePreSend(
    channelId: string,
    messageObj: MessageObject,
    options: SendMessageOptions,
    props: SendMessageProps
): Promise<boolean> {
    for (const listener of sendListeners) {
        try {
            const result = await listener(channelId, messageObj, options, props);
            if (result?.cancel) return true;
        } catch (err) {
            logger.error("Mesaj gönderme dinleyicisinde hata:\n", err);
        }
    }
    return false;
}

/** `MessageEventsAPI` patch'i tarafından çağrılır. `true` → düzenlemeyi iptal et. */
export async function _handlePreEdit(
    channelId: string,
    messageId: string,
    messageObj: MessageObject
): Promise<boolean> {
    for (const listener of editListeners) {
        try {
            const result = await listener(channelId, messageId, messageObj);
            if (result?.cancel) return true;
        } catch (err) {
            logger.error("Mesaj düzenleme dinleyicisinde hata:\n", err);
        }
    }
    return false;
}

export function _handleClick(message: any, channel: any, event: MouseEvent): void {
    // Mesaj nesnesi bayat olabilir — en güncelini çekmeyi dene.
    try {
        message = MessageStore?.getMessage?.(channel.id, message.id) ?? message;
    } catch { /* MessageStore hazır değil */ }

    for (const listener of clickListeners) {
        try {
            listener(message, channel, event);
        } catch (err) {
            logger.error("Mesaj tıklama dinleyicisinde hata:\n", err);
        }
    }
}
