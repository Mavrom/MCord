/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { addPatch, patches, patchTrace } from "./codePatcher";

describe("addPatch reporter izi", () => {
    beforeEach(() => {
        patches.length = 0;
        patchTrace.clear();
    });
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("IS_REPORTER açıkken plugin başına artan index ile iz kaydeder", () => {
        vi.stubGlobal("IS_REPORTER", true);

        addPatch({ find: "a", reason: "test", replacement: { match: "x", replace: "y" } }, "PluginA");
        addPatch({ find: "b", reason: "test", replacement: { match: "x", replace: "y" } }, "PluginA");
        addPatch({ find: "c", reason: "test", replacement: { match: "x", replace: "y" } }, "PluginB");

        const traces = [...patchTrace.entries()].map(([patch, trace]) => [patch.plugin, trace.index]);
        expect(traces).toEqual([["PluginA", 0], ["PluginA", 1], ["PluginB", 0]]);
        for (const trace of patchTrace.values()) {
            expect(trace.hits).toEqual([]);
            expect(trace.misses).toEqual([]);
        }
    });

    it("IS_REPORTER kapalıyken iz kaydetmez", () => {
        vi.stubGlobal("IS_REPORTER", false);

        addPatch({ find: "a", reason: "test", replacement: { match: "x", replace: "y" } }, "PluginZ");

        expect(patches).toHaveLength(1);
        expect(patchTrace.size).toBe(0);
    });
});
