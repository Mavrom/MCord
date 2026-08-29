/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Logger } from "../utils/logger";

const logger = new Logger("Api:Notifications", "#f4b8e4");

export interface NotificationAction {
    label: string;
    onClick(): void;
}

export interface NotificationOptions {
    title: string;
    body: string;
    /** `Infinity` = kullanıcı kapatana kadar durur (plan §8.4). */
    duration?: number;
    color?: string;
    actions?: NotificationAction[];
    onClick?(): void;
    onClose?(): void;
}

export interface ActiveNotification extends NotificationOptions {
    id: number;
    close(): void;
}

let nextId = 0;

const active: ActiveNotification[] = [];
const listeners = new Set<(notifications: ActiveNotification[]) => void>();

/** UI katmanı (Faz 7) buraya abone olup bildirimleri render eder. */
export function subscribeToNotifications(
    listener: (notifications: ActiveNotification[]) => void
): () => void {
    listeners.add(listener);
    listener([...active]);
    return () => listeners.delete(listener);
}

function notify(): void {
    const snapshot = [...active];
    for (const listener of listeners) {
        try {
            listener(snapshot);
        } catch (err) {
            logger.error("Bildirim dinleyicisinde hata:\n", err);
        }
    }
}

export function showNotification(options: NotificationOptions): ActiveNotification {
    const notification: ActiveNotification = {
        duration: 5000,
        ...options,
        id: nextId++,
        close() {
            const index = active.indexOf(notification);
            if (index === -1) return;

            active.splice(index, 1);
            notify();

            try {
                options.onClose?.();
            } catch (err) {
                logger.error("Bildirim onClose hata verdi:\n", err);
            }
        }
    };

    active.push(notification);
    notify();

    if (notification.duration !== Infinity && notification.duration! > 0) {
        setTimeout(() => notification.close(), notification.duration);
    }

    logger.info(`Bildirim: ${notification.title} — ${notification.body}`);

    return notification;
}

export function closeAllNotifications(): void {
    for (const notification of [...active]) notification.close();
}
