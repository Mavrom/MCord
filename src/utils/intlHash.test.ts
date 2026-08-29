/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { describe, expect, it } from "vitest";

import { runtimeHashMessageKey, xxHash64 } from "./intlHash";

const bytes = (s: string) => new TextEncoder().encode(s);

describe("xxHash64", () => {
    // Referans vektörler: Cyan4973/xxHash, XXH64 seed = 0
    it("boş girdi", () => {
        expect(xxHash64(bytes(""))).toBe(0xEF46DB3751D8E999n);
    });

    it("tek karakter", () => {
        expect(xxHash64(bytes("a"))).toBe(0xD24EC4F1A98C6E5Bn);
    });

    it("kısa string (< 32 bayt)", () => {
        expect(xxHash64(bytes("abc"))).toBe(0x44BC2CF5AD770999n);
    });

    it("32 baytı aşan girdi (akümülatör yolu)", () => {
        // "Nobody inspects the spammish repetition" — 39 bayt
        expect(xxHash64(bytes("Nobody inspects the spammish repetition")))
            .toBe(0xFBCEA83C8A378BF1n);
    });
});

describe("runtimeHashMessageKey", () => {
    it("6 karakterlik base64 döndürür", () => {
        const hash = runtimeHashMessageKey("MESSAGE_ACTIONS_LABEL");
        expect(hash).toHaveLength(6);
        expect(hash).toMatch(/^[A-Za-z0-9+/]{6}$/);
    });

    it("deterministik", () => {
        expect(runtimeHashMessageKey("SOME_KEY")).toBe(runtimeHashMessageKey("SOME_KEY"));
    });

    it("farklı anahtarlar farklı hash", () => {
        expect(runtimeHashMessageKey("A_KEY")).not.toBe(runtimeHashMessageKey("B_KEY"));
    });
});
