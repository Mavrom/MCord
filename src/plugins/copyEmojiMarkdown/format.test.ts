/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { describe, expect, it } from "vitest";

import { formatEmojiMarkdown } from "./format";

describe("formatEmojiMarkdown", () => {
    it("özel emojiyi Discord markdown biçimine çevirir", () => {
        expect(formatEmojiMarkdown({ id: "123", name: "blob" }, true)).toBe("<:blob:123>");
    });

    it("animasyonlu emojiyi a önekiyle biçimler", () => {
        expect(formatEmojiMarkdown({ id: "123", name: "dance", animated: true }, true))
            .toBe("<a:dance:123>");
    });

    it("çoğaltılmış emoji adındaki sayısal son eki temizler", () => {
        expect(formatEmojiMarkdown({ id: "123", name: "blob~2" }, true)).toBe("<:blob:123>");
    });

    it("varsayılan emojide unicode tercihine uyar", () => {
        expect(formatEmojiMarkdown({ name: "wave", unicode: "👋" }, true)).toBe("👋");
        expect(formatEmojiMarkdown({ name: "wave", unicode: "👋" }, false)).toBe(":wave:");
    });
});
