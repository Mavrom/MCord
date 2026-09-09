/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Logger } from "../utils/logger";

const logger = new Logger("Api:MessageEvents", "#f4b8e4");

export interface MessageObject {
    content: string;
    validNonShortcutEmojis: unknown[];
    invalidEmojis?: unknown[];
    tts?: boolean;
}

export type SendListener = (channelId: string, message: MessageObject, extra: any) => void | Promise<void>;
export type EditListener = (channelId: string, messageId: string, message: MessageObject) => void | Promise<void>;
export type ClickListener = (message: any, channel: any, event: MouseEvent) => void;

const sendListeners = new Set<SendListener>();
const editListeners = new Set<EditListener>();
const clickListeners = new Set<ClickListener>();

export function addMessagePreSendListener(listener: SendListener): SendListener {
    sendListeners.add(listener);
    return listener;
}

export function removeMessagePreSendListener(listener: SendListener): boolean {
    return sendListeners.delete(listener);
}

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

/** `MessageEventsAPI` plugin'i tarafından çağrılır. */
export async function _handlePreSend(channelId: string, message: MessageObject, extra: any): Promise<void> {
    for (const listener of sendListeners) {
        try {
            await listener(channelId, message, extra);
        } catch (err) {
            logger.error("Mesaj gönderme dinleyicisinde hata:\n", err);
        }
    }
}

export async function _handlePreEdit(channelId: string, messageId: string, message: MessageObject): Promise<void> {
    for (const listener of editListeners) {
        try {
            await listener(channelId, messageId, message);
        } catch (err) {
            logger.error("Mesaj düzenleme dinleyicisinde hata:\n", err);
        }
    }
}

export function _handleClick(message: any, channel: any, event: MouseEvent): void {
    for (const listener of clickListeners) {
        try {
            listener(message, channel, event);
        } catch (err) {
            logger.error("Mesaj tıklama dinleyicisinde hata:\n", err);
        }
    }
}
