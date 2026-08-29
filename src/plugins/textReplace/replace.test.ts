/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { describe, expect, it } from "vitest";

import { applyRules, validateRules } from "./replace";

describe("TextReplace / applyRules", () => {
    it("düz string değiştirir", () => {
        expect(applyRules("brb yemek", [{ find: "brb", replace: "birazdan dönerim" }], false))
            .toBe("birazdan dönerim yemek");
    });

    it("tüm geçişleri değiştirir", () => {
        expect(applyRules("a a a", [{ find: "a", replace: "b" }], false)).toBe("b b b");
    });

    it("regex kuralını uygular", () => {
        expect(applyRules("foo1 foo2", [{ find: "foo(\\d)", replace: "bar$1", isRegex: true }], false))
            .toBe("bar1 bar2");
    });

    it("onlyIfIncludes tutmazsa atlar", () => {
        expect(applyRules("gg", [{ find: "gg", replace: "iyi oyun", onlyIfIncludes: "oyun" }], false))
            .toBe("gg");
    });

    it("kod bloklarını korur", () => {
        expect(applyRules("brb ```brb``` brb", [{ find: "brb", replace: "X" }], true))
            .toBe("X ```brb``` X");
    });

    it("satır içi kodu korur", () => {
        expect(applyRules("a `a` a", [{ find: "a", replace: "b" }], true)).toBe("b `a` b");
    });

    it("skipCodeBlocks kapalıyken kod bloğunu da değiştirir", () => {
        expect(applyRules("`a`", [{ find: "a", replace: "b" }], false)).toBe("`b`");
    });

    it("bozuk regex'te metni bozmadan geçer", () => {
        expect(applyRules("test", [{ find: "[", replace: "x", isRegex: true }], false)).toBe("test");
    });

    it("kural yoksa aynen döner", () => {
        expect(applyRules("test", [], true)).toBe("test");
    });
});

describe("TextReplace / validateRules", () => {
    it("geçerli kuralları kabul eder", () => {
        expect(validateRules('[{"find":"a","replace":"b"}]')).toBe(true);
    });

    it("dizi olmayan kökü reddeder", () => {
        expect(validateRules('{"find":"a"}')).toMatch(/dizi olmalı/);
    });

    it("eksik alanı reddeder", () => {
        expect(validateRules('[{"find":"a"}]')).toMatch(/string olmalı/);
    });

    it("bozuk regex'i reddeder", () => {
        expect(validateRules('[{"find":"[","replace":"b","isRegex":true}]')).toMatch(/Geçersiz/);
    });

    it("bozuk JSON'u reddeder", () => {
        expect(validateRules("not json")).toMatch(/Geçersiz/);
    });
});
