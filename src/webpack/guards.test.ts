/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { describe, expect, it } from "vitest";

import { getDefaultKey } from "./guards";
import type { Module } from "./types";

function moduleWith(exports: unknown): Module {
    return { id: "test", loaded: true, exports } as Module;
}

describe("getDefaultKey", () => {
    it("primitive exportları hata vermeden atlar", () => {
        expect(getDefaultKey(moduleWith("browser"))).toBeUndefined();
        expect(getDefaultKey(moduleWith(true))).toBeUndefined();
        expect(getDefaultKey(moduleWith(42))).toBeUndefined();
    });

    it("Discord varsayılan export anahtarlarını tanır", () => {
        expect(getDefaultKey(moduleWith({ A: {} }))).toBe("A");
        expect(getDefaultKey(moduleWith({ Ay: {} }))).toBe("Ay");
        expect(getDefaultKey(moduleWith({ __esModule: true, default: {} }))).toBe("default");
    });
});
