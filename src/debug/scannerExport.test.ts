/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { describe, expect, it } from "vitest";

import { chunkModules, collectModules, serializePat, shapeOf } from "./scannerExport";

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
