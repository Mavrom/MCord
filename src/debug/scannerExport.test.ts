/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { describe, expect, it } from "vitest";

import { ANONYMOUS_FILTER_LABEL } from "../webpack/filters";
import type { ModuleFilter } from "../webpack/types";
import { chunkModules, collectModules, serializePat, shapeOf, stableFilterLabel } from "./scannerExport";

describe("scannerExport yardımcıları", () => {
    it("serializePat string ve regex'i ayırır", () => {
        expect(serializePat("abc")).toEqual({ source: "abc", flags: "", isRegex: false });
        expect(serializePat(/a\.b/g)).toEqual({ source: "a\\.b", flags: "g", isRegex: true });
    });
    it("shapeOf ilk düzey anahtarları sıralı ve sınırlı döndürür", () => {
        expect(shapeOf({ b: 1, a: 2 })).toEqual(["a", "b"]);
        expect(shapeOf(null)).toBeNull();
        expect(shapeOf(() => 1)).toEqual(["<function>"]);
        const big = Object.fromEntries(Array.from({ length: 80 }, (_, i) => [`k${String(i).padStart(2, "0")}`, i]));
        expect(shapeOf(big)).toHaveLength(50);
    });
    it("shapeOf fırlatan getter'da patlamaz", () => {
        const o = {};
        Object.defineProperty(o, "bad", { get() { throw new Error("x"); }, enumerable: true });
        expect(shapeOf(o)).toEqual(["bad"]);
    });
    it("chunkModules 500'lük paketlere böler", () => {
        const mods = Object.fromEntries(Array.from({ length: 1201 }, (_, i) => [String(i), "s"]));
        const chunks = chunkModules(mods, 500);
        expect(chunks.map(c => Object.keys(c).length)).toEqual([500, 500, 201]);
    });

    it("collectModules Proxy'lenmiş fabrikadan orijinal kaynağı okur", () => {
        function factory(module: { exports: unknown }) { module.exports = "ORIJINAL_GOVDE"; }
        // intercept.ts'teki moduleFactoryHandler ile aynı: toString orijinale yönlenir.
        const proxied = new Proxy(factory, {
            get(target, p, receiver) {
                if (p === "toString") return target.toString.bind(target);
                return Reflect.get(target, p, receiver);
            }
        });
        const out = collectModules({ 123: proxied });
        expect(out["123"]).toContain("ORIJINAL_GOVDE");
        expect(out["123"]).not.toContain("[native code]");
    });
});

describe("stableFilterLabel", () => {
    const a = ((m: any) => m?.getCurrentUser) as unknown as ModuleFilter;
    const b = ((m: any) => m?.get && m?.post) as unknown as ModuleFilter;

    it("anonim filtreleri kaynağa göre ayrı etiketler", () => {
        const la = stableFilterLabel(ANONYMOUS_FILTER_LABEL, a);
        const lb = stableFilterLabel(ANONYMOUS_FILTER_LABEL, b);
        expect(la).not.toBe(lb);
        expect(la).toMatch(/^<anonim filtre [0-9a-f]{8}: .+>$/);
    });
    it("aynı kaynak için kararlı", () => {
        const same = ((m: any) => m?.getCurrentUser) as unknown as ModuleFilter;
        expect(stableFilterLabel(ANONYMOUS_FILTER_LABEL, a)).toBe(stableFilterLabel(ANONYMOUS_FILTER_LABEL, same));
    });
    it("açıklamalı etiketi değiştirmez", () => {
        expect(stableFilterLabel('byKeys("a")', a)).toBe('byKeys("a")');
    });
    it("kaynağı boşlukları sıkıştırıp 60 karaktere kırpar", () => {
        const long = Object.assign(() => 0, { toString: () => "x".repeat(100) + "\n\n  y" }) as unknown as ModuleFilter;
        expect(stableFilterLabel(ANONYMOUS_FILTER_LABEL, long)).toMatch(/^<anonim filtre [0-9a-f]{8}: x{60}>$/);
        const spaced = Object.assign(() => 0, { toString: () => "a\n\n   b" }) as unknown as ModuleFilter;
        expect(stableFilterLabel(ANONYMOUS_FILTER_LABEL, spaced)).toMatch(/: a b>$/);
    });
});
