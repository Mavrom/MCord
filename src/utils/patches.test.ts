/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { describe, expect, it } from "vitest";

import { canonicalizeMatch, canonicalizeReplace, pluginPathOf } from "./patches";

describe("canonicalizeMatch — \\i kısayolu", () => {
    it("regex'te \\i'yi tanımlayıcı desenine çevirir (grupsuz — Vencord ile birebir)", () => {
        expect(canonicalizeMatch(/let \i=/).source).toBe(String.raw`let [A-Za-z_$][\w$]*=`);
    });

    it("birden fazla \\i'yi çevirir", () => {
        expect(canonicalizeMatch(/\i\.\i/).source)
            .toBe(String.raw`[A-Za-z_$][\w$]*\.[A-Za-z_$][\w$]*`);
    });

    it("kaçırılmış \\i'yi genişletmez, bir ters bölü düşürür", () => {
        // Kaçış semantiği: tek sayıda öncü ters bölü varsa `\i` kaçırılmıştır;
        // tanımlayıcı desenine çevrilmez, bir ters bölü düşürülüp literal bırakılır.
        expect(canonicalizeMatch(/a\\i/).source).toBe(String.raw`a\i`);
    });

    it("orijinal deseni toString ile korur", () => {
        // Hata mesajlarında genişletilmiş yığın değil, yazılan desen görünmeli.
        const original = /let \i=/;
        expect(String(canonicalizeMatch(original))).toBe(String(original));
    });

    it("flags'i korur", () => {
        expect(canonicalizeMatch(/\i/g).flags).toBe("g");
    });

    it("string match'te \\i'ye dokunmaz", () => {
        expect(canonicalizeMatch(String.raw`a\i`)).toBe(String.raw`a\i`);
    });
});

describe("canonicalizeMatch — #{intl::} çözümlemesi", () => {
    it("string'de nokta erişimine çevirir", () => {
        const result = canonicalizeMatch("#{intl::MESSAGE_ACTIONS_LABEL}") as string;
        expect(result).toMatch(/^(\.[A-Za-z][A-Za-z0-9+/]{5}|\["[A-Za-z0-9+/]{6}"\])$/);
    });

    it("::raw değiştiricisi hash'lemeden bırakır", () => {
        expect(canonicalizeMatch("#{intl::abcdef::raw}")).toBe(".abcdef");
    });

    it("regex'te kaçışlı biçim üretir", () => {
        const result = canonicalizeMatch(/#{intl::abcdef::raw}/).source;
        expect(result).toBe(String.raw`(?:\.abcdef)`);
    });

    it("rakamla başlayan hash'i köşeli paranteze alır", () => {
        expect(canonicalizeMatch("#{intl::1abcde::raw}")).toBe('["1abcde"]');
    });
});

describe("canonicalizeReplace", () => {
    it("$self'i plugin runtime yoluna çevirir", () => {
        expect(canonicalizeReplace("$self.onClick(e)", pluginPathOf("MyPlugin")))
            .toBe('Mcord.Plugins.plugins["MyPlugin"].onClick(e)');
    });

    it("tüm $self geçişlerini çevirir", () => {
        expect(canonicalizeReplace("$self.a;$self.b", pluginPathOf("P")))
            .toBe('Mcord.Plugins.plugins["P"].a;Mcord.Plugins.plugins["P"].b');
    });

    it("fonksiyon replace'i sarmalar", () => {
        const fn = canonicalizeReplace(() => "$self.x", pluginPathOf("P")) as () => string;
        expect(fn()).toBe('Mcord.Plugins.plugins["P"].x');
    });
});
