/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
    dispatch: vi.fn(),
    store: {} as Record<string, any>,
    userId: "self",
    raw: { plugins: { MessageLogger: {} as Record<string, unknown> } }
}));
vi.mock("../../api/settings", () => ({ getRawSettings: () => mock.raw, subscribeToSettings: () => () => {} }));
vi.mock("../../webpack/common", () => ({
    ChannelStore: { getChannel: () => ({ guild_id: "g" }) },
    UserStore: { getCurrentUser: () => ({ id: mock.userId }) },
    MessageStore: { getMessage: () => undefined },
    getFluxDispatcher: () => ({ dispatch: mock.dispatch })
}));
vi.mock("./settings", () => ({ settings: { store: mock.store } }));

import { handleDelete, history, recordEdit, resetAccount, startLogging, stopLogging } from "./runtime";

function cache(messages: any[]) {
    return { get: (id: string) => messages.find(message => message.id === id), remove: (id: string) => cache(messages.filter(message => message.id !== id)) };
}

beforeEach(async () => {
    stopLogging();
    await Promise.resolve();
    mock.dispatch.mockClear();
    mock.userId = "self";
    mock.raw.plugins.MessageLogger = {};
    Object.assign(mock.store, { logDeletes: true, logEdits: true, logDeletedAttachments: true, ignoreBots: true, ignoreSelf: false, ignoreUsers: "", ignoreChannels: "", ignoreGuilds: "", maxEntries: 500 });
    startLogging();
});
afterEach(() => stopLogging());

describe("MessageLogger / yerel store davranışı", () => {
    it("toplu silmede normal mesajı tutar, bot ve ephemeral mesajları kaldırır", () => {
        const normal = { id: "1", channel_id: "c", content: "metin", author: { id: "other" } };
        const source = cache([normal, { ...normal, id: "2", author: { bot: true } }, { ...normal, id: "3", flags: 64 }]);
        const result = handleDelete(source, { channelId: "c", ids: ["1", "2", "3"] });
        expect(result.get("1")).toBe(normal);
        expect(result.get("2")).toBeUndefined();
        expect(result.get("3")).toBeUndefined();
        expect(mock.dispatch).not.toHaveBeenCalled();
    });

    it("yerel temizleme yalnız MESSAGE_DELETE üretir, bu olay yeniden kaydedilmez", async () => {
        const source = cache([{ id: "1", channel_id: "c", author: { id: "other" }, content: "metin" }]);
        handleDelete(source, { channelId: "c", id: "1" });
        history.forget("c", "1");
        await Promise.resolve();
        const event = mock.dispatch.mock.calls[0][0];
        expect(event.type).toBe("MESSAGE_DELETE");
        expect(handleDelete(source, event)).toBeNull();
        expect(history.get("c", "1")).toBeUndefined();
    });

    it("düzenleme yakalama giden mesaj üretmez ve özgün kaydı aynen döndürür", () => {
        const previous = { id: "1", channel_id: "c", author: { id: "other" }, content: "eski" };
        expect(recordEdit(previous, { content: "yeni", edited_timestamp: "2026-09-02" })).toBe(previous);
        expect(history.get("c", "1")?.edits[0].content).toBe("eski");
        expect(mock.dispatch).not.toHaveBeenCalled();
    });

    it("plugin durduğunda yama özgün Discord işleyicisine döner", () => {
        stopLogging();
        expect(handleDelete(cache([]), { channelId: "c", id: "1" })).toBeNull();
    });

    it("hesap değişiminde eski hesabın geçmişini temizler", () => {
        history.recordDelete({ id: "1", channel_id: "c", author: { id: "other" } }, mock.store as any, {});
        mock.userId = "second";
        resetAccount();
        expect(history.get("c", "1")).toBeUndefined();
    });

    it("eski kapalı silme tercihini logDeletes ayarına taşır", () => {
        stopLogging();
        mock.raw.plugins.MessageLogger = { keepDeletedMessages: false };
        startLogging();
        expect(mock.store.logDeletes).toBe(false);
    });
});
