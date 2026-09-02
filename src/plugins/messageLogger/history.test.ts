/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { describe, expect, it, vi } from "vitest";

import { canonicalizeMatch, canonicalizeReplace } from "../../utils/patches";
import { type HistoryOptions, LocalMessageHistory, shouldIgnore } from "./history";
import { messageLoggerPatches } from "./patches";

const options: HistoryOptions = {
    logDeletes: true, logEdits: true, logDeletedAttachments: true,
    ignoreBots: true, ignoreSelf: false, ignoreUsers: "", ignoreChannels: "", ignoreGuilds: "", maxEntries: 500
};
const message = (id = "1", channel = "c") => ({ id, channel_id: channel, author: { id: "user", bot: false }, content: "ilk", timestamp: "2026-09-02T10:00:00Z", attachments: [] });

describe("MessageLogger / yalnız yerel geçmiş", () => {
    it("silinen mesajın kimliğini korur, kaynak nesneyi değiştirmez", () => {
        const history = new LocalMessageHistory();
        const original = Object.freeze(message());
        expect(history.recordDelete(original, options, {})).toBe(true);
        expect(history.get("c", "1")).toMatchObject({ id: "1", channelId: "c", deleted: true, content: "ilk" });
        expect(original).not.toHaveProperty("deleted");
    });

    it("her kanalın geçmişini ayrı tutar ve kanal bazında temizler", () => {
        const history = new LocalMessageHistory();
        history.recordDelete(message("1", "private"), options, {});
        history.recordDelete(message("1", "public"), options, {});
        history.clear("public");
        expect(history.get("public", "1")).toBeUndefined();
        expect(history.get("private", "1")?.deleted).toBe(true);
    });

    it("kısmi düzenleme olayında önceki yazarı ve doğru eski metni kullanır", () => {
        const history = new LocalMessageHistory();
        const original = message();
        const update = { id: "1", channel_id: "c", content: "ikinci", edited_timestamp: "2026-09-02T10:01:00Z" };
        history.recordEdit(original, update, options, {});
        history.recordEdit({ ...original, ...update }, { ...update, content: "son", edited_timestamp: "2026-09-02T10:02:00Z" }, options, {});
        expect(history.get("c", "1")?.edits.map(edit => edit.content)).toEqual(["ilk", "ikinci"]);
        expect(history.get("c", "1")?.content).toBe("son");
        expect(original.content).toBe("ilk");
    });

    it("aynı içerik ve içeriği olmayan olaylar hayali düzenleme oluşturmaz", () => {
        const history = new LocalMessageHistory();
        history.recordEdit(message(), { content: "ilk", edited_timestamp: "2026-09-02" }, options, {});
        history.recordEdit(message(), { embeds: [] }, options, {});
        expect(history.get("c", "1")).toBeUndefined();
    });

    it("bot, kendi mesajı, ephemeral ve kapalı kayıt seçeneklerine uyar", () => {
        expect(shouldIgnore({ ...message(), author: { bot: true } }, options, {})).toBe(true);
        expect(shouldIgnore(message(), { ...options, ignoreSelf: true }, { userId: "user" })).toBe(true);
        expect(shouldIgnore({ ...message(), flags: 64 }, options, {})).toBe(true);
        expect(shouldIgnore(message(), { ...options, logDeletes: false }, {})).toBe(true);
        expect(shouldIgnore(message(), { ...options, logEdits: false }, {}, true)).toBe(true);
        expect(shouldIgnore(message(), options, { userId: "user" })).toBe(false);
    });

    it("yok sayma listelerinde alt dize değil tam kimlik arar", () => {
        expect(shouldIgnore(message(), { ...options, ignoreUsers: "user2, other" }, {})).toBe(false);
        expect(shouldIgnore(message(), { ...options, ignoreUsers: "other, user" }, {})).toBe(true);
        expect(shouldIgnore(message(), { ...options, ignoreChannels: "parent" }, { parentId: "parent" })).toBe(true);
        expect(shouldIgnore(message(), { ...options, ignoreGuilds: "guild" }, { guildId: "guild" })).toBe(true);
    });

    it("kaldırılmış ekleri birleştirir, geri gelen eki silinmiş saymaz", () => {
        const history = new LocalMessageHistory();
        const original = { ...message(), attachments: [{ id: "a", filename: "resim.png", url: "https://cdn.discordapp.com/a" }] };
        history.recordEdit(original, { attachments: [] }, options, {});
        expect(history.get("c", "1")?.attachments.map(attachment => attachment.id)).toEqual(["a"]);
        history.recordEdit({ ...original, attachments: [] }, { attachments: original.attachments }, options, {});
        expect(history.get("c", "1")).toBeUndefined();
    });

    it("geri gelen eki geçmişten çıkarırken gerçek metin düzenlemelerini korur", () => {
        const history = new LocalMessageHistory();
        const original = { ...message(), attachments: [{ id: "a", filename: "resim.png" }] };
        const update = { content: "son", edited_timestamp: "2026-09-02T10:01:00Z", attachments: [] };
        history.recordEdit(original, update, options, {});
        history.recordEdit({ ...original, ...update }, { attachments: original.attachments }, options, {});
        expect(history.get("c", "1")?.attachments).toEqual([]);
        expect(history.get("c", "1")?.edits.map(edit => edit.content)).toEqual(["ilk"]);
    });

    it("kapalı ek kaydı seçeneğinde kaldırılan eki kaydetmez", () => {
        const history = new LocalMessageHistory();
        history.recordEdit({ ...message(), attachments: [{ id: "a" }] }, { attachments: [] }, { ...options, logDeletedAttachments: false }, {});
        expect(history.get("c", "1")).toBeUndefined();
    });

    it("toplam sınırda en eski silinmiş mesajı yerelden temizleme için bildirir", () => {
        const purge = vi.fn();
        const history = new LocalMessageHistory(purge);
        history.recordDelete(message("1"), { ...options, maxEntries: 1 }, {});
        history.recordDelete(message("2"), { ...options, maxEntries: 1 }, {});
        expect(history.get("c", "1")).toBeUndefined();
        expect(purge).toHaveBeenCalledWith(expect.objectContaining({ id: "1", deleted: true }));
    });

    it("mesaj başına düzenleme sayısını ve metin bütçesini sınırlar", () => {
        const history = new LocalMessageHistory();
        for (let index = 0; index < 80; index++) {
            history.recordEdit({ ...message(), content: String(index).repeat(4000) }, { content: String(index + 1), edited_timestamp: "2026-09-02" }, options, {});
        }
        const edits = history.get("c", "1")!.edits;
        expect(edits.length).toBeLessThanOrEqual(20);
        expect(edits.reduce((count, edit) => count + edit.content.length, 0)).toBeLessThanOrEqual(32_000);
    });

    it("aboneleri MessageStore işi sonrasına erteler; abonelik çıkışını korur", async () => {
        const history = new LocalMessageHistory();
        const callback = vi.fn();
        const unsubscribe = history.subscribe("c", "1", callback);
        history.recordDelete(message(), options, {});
        expect(callback).not.toHaveBeenCalled();
        await Promise.resolve();
        expect(callback).toHaveBeenCalledTimes(1);
        unsubscribe();
        history.clear();
        await Promise.resolve();
        expect(callback).toHaveBeenCalledTimes(1);
    });
});

function applyPatch(source: string, index: number): string {
    const patch = messageLoggerPatches[index];
    for (const replacement of Array.isArray(patch.replacement) ? patch.replacement : [patch.replacement]) {
        const match = canonicalizeMatch(replacement.match);
        expect(source.match(match)).not.toBeNull();
        const replace = canonicalizeReplace(replacement.replace, "plugin");
        source = typeof replace === "string" ? source.replace(match, replace) : source.replace(match, replace);
    }
    return source;
}

describe("MessageLogger / MessageStore yama sözleşmesi", () => {
    it("tekli ve toplu silme yaması aynı yerel sınırda çalışır; no-op özgün işleme döner", () => {
        const source = "({MESSAGE_DELETE:function(e){let c=b.cache.getOrCreate(e.channelId);b.original(e.id)},MESSAGE_DELETE_BULK:function(e){let c=b.cache.getOrCreate(e.channelId);b.original(e.ids)}})";
        const b = { cache: { getOrCreate: vi.fn(() => ({})), commit: vi.fn() }, original: vi.fn() };
        const plugin = { handleDelete: vi.fn((cache: unknown) => cache) };
        const handlers = new Function("b", "plugin", `return ${applyPatch(source, 0)}`)(b, plugin);
        handlers.MESSAGE_DELETE({ channelId: "c", id: "1" });
        handlers.MESSAGE_DELETE_BULK({ channelId: "c", ids: ["1", "2"] });
        expect(b.cache.commit).toHaveBeenCalledTimes(2);
        expect(b.original).not.toHaveBeenCalled();
        plugin.handleDelete.mockReturnValueOnce(null);
        handlers.MESSAGE_DELETE({ channelId: "c", id: "3" });
        expect(b.original).toHaveBeenCalledWith("3");
    });

    it("düzenleme yaması önceki içeriği normal güncellemeden önce okur", () => {
        const source = "({MESSAGE_UPDATE:function(e){let id=e.message.id;return c.update(id,m=>({...m,...e.message}))}})";
        let stored = message();
        const c = { update: (_id: string, update: (message: any) => any) => { stored = update(stored); return c; } };
        const plugin = { recordEdit: vi.fn(previous => previous) };
        const handlers = new Function("c", "plugin", `return ${applyPatch(source, 1)}`)(c, plugin);
        handlers.MESSAGE_UPDATE({ message: { id: "1", content: "son" } });
        expect(plugin.recordEdit.mock.calls[0][0].content).toBe("ilk");
        expect(stored.content).toBe("son");
    });
});
