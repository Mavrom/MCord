/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { describe, expect, it } from "vitest";

import { cleanText, cleanUrl, codeRanges } from "./clean";

describe("cleanUrl", () => {
    it("çıkarır: global utm parametreleri", () => {
        expect(cleanUrl("https://example.com/p?utm_source=x&utm_medium=y&id=5"))
            .toBe("https://example.com/p?id=5");
    });

    it("çıkarır: fbclid / gclid", () => {
        expect(cleanUrl("https://example.com/?fbclid=abc")).toBe("https://example.com/");
        expect(cleanUrl("https://example.com/?gclid=abc&q=1")).toBe("https://example.com/?q=1");
    });

    it("host'a özel: youtube si parametresini siler ama v'yi korur", () => {
        expect(cleanUrl("https://youtu.be/dQw4w9WgXcQ?si=abcd1234"))
            .toBe("https://youtu.be/dQw4w9WgXcQ");
        expect(cleanUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&si=xyz"))
            .toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    });

    it("host'a özel: twitter/x s ve t parametrelerini siler", () => {
        expect(cleanUrl("https://x.com/user/status/123?s=20&t=abcdef"))
            .toBe("https://x.com/user/status/123");
    });

    it("başka host'ta tek harfli parametreye dokunmaz", () => {
        expect(cleanUrl("https://example.com/search?s=query"))
            .toBe("https://example.com/search?s=query");
    });

    it("parametre yoksa string'i aynen döndürür", () => {
        expect(cleanUrl("https://example.com/path")).toBe("https://example.com/path");
        expect(cleanUrl("https://example.com/path/")).toBe("https://example.com/path/");
    });

    it("hiç izleyici yoksa orijinali korur (yeniden serileştirme yok)", () => {
        expect(cleanUrl("https://example.com/?b=2&a=1")).toBe("https://example.com/?b=2&a=1");
    });

    it("hash'i korur", () => {
        expect(cleanUrl("https://example.com/?utm_source=x#section"))
            .toBe("https://example.com/#section");
    });

    it("URL olmayan girdiyi aynen döndürür", () => {
        expect(cleanUrl("merhaba dünya")).toBe("merhaba dünya");
        expect(cleanUrl("ftp://example.com/?utm_source=x")).toBe("ftp://example.com/?utm_source=x");
    });
});

describe("cleanText", () => {
    it("metindeki birden fazla URL'yi temizler", () => {
        const input = "bak https://a.com/?utm_source=x ve https://b.com/?fbclid=y son";
        expect(cleanText(input)).toBe("bak https://a.com/ ve https://b.com/ son");
    });

    it("skip aralıklarındaki URL'lere dokunmaz", () => {
        const input = "`https://a.com/?utm_source=x` normal https://b.com/?utm_source=x";
        const ranges = codeRanges(input);
        expect(cleanText(input, ranges))
            .toBe("`https://a.com/?utm_source=x` normal https://b.com/");
    });

    it("kod bloğu içindeki URL'leri korur", () => {
        const input = "```\nhttps://a.com/?utm_source=x\n```";
        expect(cleanText(input, codeRanges(input))).toBe(input);
    });
});
