/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { describe, expect, it, vi } from "vitest";

import { before } from "./functionPatcher";

describe("functionPatcher getter exports", () => {
    it("patches and restores configurable getter exports", () => {
        const original = vi.fn((value: number) => value * 2);
        const module = {} as { run(value: number): number };

        Object.defineProperty(module, "run", {
            configurable: true,
            enumerable: true,
            get: () => original
        });

        const callback = vi.fn((_self: unknown, args: unknown[]) => {
            args[0] = 4;
        });
        const unpatch = before("GetterTest", module, "run", callback);

        expect(module.run(2)).toBe(8);
        expect(callback).toHaveBeenCalledOnce();
        expect(module.run).not.toBe(original);

        unpatch();

        expect(Object.getOwnPropertyDescriptor(module, "run")?.get).toBeTypeOf("function");
        expect(module.run).toBe(original);
    });
});
