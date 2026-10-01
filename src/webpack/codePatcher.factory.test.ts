/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ModuleFactory, PatchedModuleFactory } from "./types";

// `patchFactory` dışa aktarılmıyor; `initCodePatcher` onu proxy'ye kaydediyor.
// Kaydı yakalayıp gerçek fabrika patch'leme yolunu sahte bir fabrikayla sürüyoruz.
const captured = vi.hoisted(() => ({
    patcher: null as null | ((id: PropertyKey, factory: ModuleFactory) => PatchedModuleFactory | null)
}));
vi.mock("./proxy", () => ({
    setFactoryPatcher: (p: typeof captured.patcher) => { captured.patcher = p; }
}));

const { addPatch, initCodePatcher, patches, patchTrace } = await import("./codePatcher");

const FACTORY = function (e: { exports: unknown }) { const MARKER = 1; e.exports = MARKER && "hello"; } as unknown as ModuleFactory;

describe("patchFactory reporter izi (hit / miss / hata)", () => {
    beforeEach(() => {
        patches.length = 0;
        patchTrace.clear();
        vi.stubGlobal("IS_REPORTER", true);
        vi.spyOn(console, "error").mockImplementation(() => {});
        vi.spyOn(console, "warn").mockImplementation(() => {});
        initCodePatcher();
    });
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it("find tutunca hit, tutmayan match miss, fırlatan replace ve sözdizimi hatası errors'a düşer", () => {
        addPatch({
            find: "MARKER",
            reason: "test",
            all: true,
            replacement: [
                { match: '"hello"', replace: '"bye"' },
                { match: "YOK_BOYLE_BIR_SEY", replace: "x" },
                { match: "MARKER", replace: () => { throw new Error("replace patladı"); } },
                { match: "const MARKER", replace: "const )(" }
            ]
        }, "TestPlugin");
        addPatch({ find: "BASKA_MODUL", reason: "test", replacement: { match: "a", replace: "b" } }, "Other");

        const patched = captured.patcher!("42", FACTORY);
        expect(patched).not.toBeNull();

        const module = { exports: null as unknown };
        (patched as any)(module);
        expect(module.exports).toBe("bye");
        // `bySource` filtreleri ham kaynağı görmeye devam eder.
        expect(String(patched)).toBe(String(FACTORY));

        const [first, second] = [...patchTrace.values()];
        expect(first.hits).toEqual(["42"]);
        expect(first.misses).toEqual([{ moduleId: "42", match: "YOK_BOYLE_BIR_SEY" }]);
        expect(first.errors).toHaveLength(2);
        expect(first.errors[0]).toMatchObject({ moduleId: "42", match: "MARKER" });
        expect(first.errors[0].error).toContain("replace patladı");
        expect(first.errors[1]).toMatchObject({ moduleId: "42", match: "const MARKER" });
        expect(first.errors[1].error).toContain("SyntaxError");

        expect(second).toEqual({ index: 0, hits: [], misses: [], errors: [] });
    });

    it("hiçbir find tutmazsa fabrika patch'lenmez, iz boş kalır", () => {
        addPatch({ find: "YOK", reason: "test", replacement: { match: "a", replace: "b" } }, "Unmatched");
        expect(captured.patcher!("7", FACTORY)).toBeNull();
        expect([...patchTrace.values()][0]).toEqual({ index: 0, hits: [], misses: [], errors: [] });
    });

    it("IS_REPORTER kapalıyken davranış aynı, iz tutulmaz", () => {
        vi.stubGlobal("IS_REPORTER", false);
        addPatch({ find: "MARKER", reason: "test", replacement: { match: '"hello"', replace: '"bye"' } }, "TestPlugin");
        const patched = captured.patcher!("9", FACTORY);
        const module = { exports: null as unknown };
        (patched as any)(module);
        expect(module.exports).toBe("bye");
        expect(patchTrace.size).toBe(0);
    });
});
