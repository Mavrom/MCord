/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/**
 * Sabitlenen kanalları listenin başına taşır.
 *
 * Saf fonksiyon — birim testi bunun üzerinde (`reorder.test.ts`).
 */
export function reorder(channelIds: string[], pinned: string[], newestFirst: boolean): string[] {
    if (pinned.length === 0) return channelIds;

    const pinnedSet = new Set(pinned);
    const order = newestFirst ? [...pinned].reverse() : pinned;

    const head = order.filter(id => channelIds.includes(id));
    const tail = channelIds.filter(id => !pinnedSet.has(id));

    return [...head, ...tail];
}
