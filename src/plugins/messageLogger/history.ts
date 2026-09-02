/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

export interface HistoryOptions {
    logDeletes: boolean;
    logEdits: boolean;
    logDeletedAttachments: boolean;
    ignoreBots: boolean;
    ignoreSelf: boolean;
    ignoreUsers: string;
    ignoreChannels: string;
    ignoreGuilds: string;
    maxEntries: number;
}

export interface MessageContext {
    userId?: string;
    guildId?: string;
    parentId?: string;
}

export interface EditVersion { content: string; timestamp: number }
export interface SavedAttachment { id: string; filename: string; url: string }
export interface MessageHistoryEntry {
    id: string;
    channelId: string;
    guildId?: string;
    deleted: boolean;
    highlight: boolean;
    edits: EditVersion[];
    attachments: SavedAttachment[];
    content: string;
    timestamp: number;
}

const MAX_EDITS = 20;
const MAX_HISTORY_CHARS = 32_000;
const MAX_ATTACHMENTS = 50;

export function messageKey(channelId: string, id: string): string {
    return `${channelId}:${id}`;
}

function includesId(list: string, id: unknown): boolean {
    return typeof id === "string" && id.length > 0 && String(list).split(/[\s,]+/).includes(id);
}

function timeOf(value: unknown): number {
    const time = value instanceof Date ? value.getTime() : new Date(value as string | number).getTime();
    return Number.isFinite(time) ? time : Date.now();
}

export function shouldIgnore(message: any, options: HistoryOptions, context: MessageContext, editing = false): boolean {
    if (!message || typeof message.id !== "string" || typeof message.channel_id !== "string") return true;
    if ((Number(message.flags ?? 0) & 64) !== 0) return true;
    if (editing ? !options.logEdits : !options.logDeletes) return true;
    return Boolean(
        options.ignoreBots && message.author?.bot
        || options.ignoreSelf && context.userId && message.author?.id === context.userId
        || includesId(options.ignoreUsers, message.author?.id)
        || includesId(options.ignoreChannels, message.channel_id)
        || includesId(options.ignoreChannels, context.parentId)
        || includesId(options.ignoreGuilds, context.guildId)
    );
}

/** Oturumluk yan kayıt: Discord'un MessageRecord nesnelerine veya diske yazmaz. */
export class LocalMessageHistory {
    private readonly entries = new Map<string, MessageHistoryEntry>();
    private readonly listeners = new Map<string, Set<() => void>>();
    private readonly dirty = new Set<string>();
    private scheduled = false;

    constructor(private readonly purgeDeleted: (entry: MessageHistoryEntry) => void = () => {}) {}

    get(channelId: string, id: string): MessageHistoryEntry | undefined {
        return this.entries.get(messageKey(channelId, id));
    }

    subscribe(channelId: string, id: string, listener: () => void): () => void {
        const key = messageKey(channelId, id);
        const subscribers = this.listeners.get(key) ?? new Set();
        subscribers.add(listener);
        this.listeners.set(key, subscribers);
        return () => {
            subscribers.delete(listener);
            if (!subscribers.size) this.listeners.delete(key);
        };
    }

    private notify(key: string): void {
        this.dirty.add(key);
        if (this.scheduled) return;
        this.scheduled = true;
        // MessageStore işlemi bitmeden React veya iç içe Flux dispatch çalıştırma.
        queueMicrotask(() => {
            this.scheduled = false;
            const keys = [...this.dirty];
            this.dirty.clear();
            for (const changed of keys) for (const listener of this.listeners.get(changed) ?? []) listener();
        });
    }

    private save(entry: MessageHistoryEntry, maxEntries: number): void {
        const key = messageKey(entry.channelId, entry.id);
        this.entries.delete(key);
        this.entries.set(key, entry);
        this.notify(key);
        this.trim(maxEntries);
    }

    trim(maxEntries: number): void {
        const limit = Number.isFinite(maxEntries) ? Math.max(1, Math.min(2500, Math.floor(maxEntries))) : 500;
        while (this.entries.size > limit) {
            const oldest = this.entries.values().next().value!;
            this.forget(oldest.channelId, oldest.id);
        }
    }

    private initial(message: any, context: MessageContext): MessageHistoryEntry {
        return {
            id: message.id,
            channelId: message.channel_id,
            guildId: context.guildId,
            deleted: false,
            highlight: true,
            edits: [],
            attachments: [],
            content: typeof message.content === "string" ? message.content : "",
            timestamp: timeOf(message.editedTimestamp ?? message.edited_timestamp ?? message.timestamp)
        };
    }

    recordDelete(message: any, options: HistoryOptions, context: MessageContext): boolean {
        if (shouldIgnore(message, options, context)) return false;
        const previous = this.get(message.channel_id, message.id) ?? this.initial(message, context);
        this.save({ ...previous, deleted: true, content: typeof message.content === "string" ? message.content : previous.content }, options.maxEntries);
        return true;
    }

    recordEdit(previous: any, update: any, options: HistoryOptions, context: MessageContext): void {
        if (!previous || !update) return;
        const message = { ...previous, ...update, author: update.author ?? previous.author };
        if (shouldIgnore(message, options, context, true)) return;
        const contentChanged = typeof update.content === "string" && update.content !== previous.content
            && update.edited_timestamp != null;
        const current = this.get(message.channel_id, message.id) ?? this.initial(previous, context);
        let attachments = current.attachments;
        if (options.logDeletedAttachments && Array.isArray(update.attachments)) {
            const present = new Set(update.attachments.map((attachment: any) => attachment.id));
            const removed = new Map(current.attachments.filter(attachment => !present.has(attachment.id)).map(attachment => [attachment.id, attachment]));
            for (const attachment of previous.attachments ?? []) {
                if (typeof attachment.id !== "string" || present.has(attachment.id)) continue;
                removed.set(attachment.id, {
                    id: attachment.id,
                    filename: String(attachment.filename ?? "Dosya"),
                    url: String(attachment.url ?? attachment.proxy_url ?? "")
                });
            }
            attachments = [...removed.values()].slice(-MAX_ATTACHMENTS);
        }
        if (!contentChanged && attachments === current.attachments) return;
        if (!contentChanged && !attachments.length && !current.edits.length && !current.deleted) {
            this.forget(message.channel_id, message.id, false);
            return;
        }
        const edits = contentChanged
            ? [...current.edits, { content: String(previous.content ?? ""), timestamp: current.timestamp }].slice(-MAX_EDITS)
            : current.edits;
        let characters = edits.reduce((sum, version) => sum + version.content.length, 0);
        while (characters > MAX_HISTORY_CHARS && edits.length) characters -= edits.shift()!.content.length;
        this.save({
            ...current,
            edits,
            attachments,
            content: typeof update.content === "string" ? update.content : current.content,
            timestamp: contentChanged ? timeOf(update.edited_timestamp) : current.timestamp
        }, options.maxEntries);
    }

    forget(channelId: string, id: string, purge = true): void {
        const key = messageKey(channelId, id);
        const entry = this.entries.get(key);
        if (!entry) return;
        this.entries.delete(key);
        this.notify(key);
        if (purge && entry.deleted) this.purgeDeleted(entry);
    }

    clear(channelId?: string, guildId?: string): void {
        for (const entry of [...this.entries.values()]) {
            if (channelId && entry.channelId !== channelId || guildId && entry.guildId !== guildId) continue;
            this.forget(entry.channelId, entry.id);
        }
    }

    hasChannel(channelId: string): boolean {
        return [...this.entries.values()].some(entry => entry.channelId === channelId);
    }

    toggleHighlight(channelId: string, id: string): void {
        const key = messageKey(channelId, id);
        const entry = this.entries.get(key);
        if (!entry) return;
        this.entries.set(key, { ...entry, highlight: !entry.highlight });
        this.notify(key);
    }

    refresh(): void {
        for (const [key, entry] of this.entries) {
            this.entries.set(key, { ...entry });
            this.notify(key);
        }
    }
}
