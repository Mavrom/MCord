/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { describe, expect, it } from "vitest";

import { parseHidden } from "./parse";

describe("BetterSettings / parseHidden", () => {
    it("boş dize boş küme verir", () => {
        expect(parseHidden("").size).toBe(0);
    });

    it("virgülle ayırır", () => {
        expect([...parseHidden("nitro,billing")]).toEqual(["nitro", "billing"]);
    });

    it("boşlukları kırpar", () => {
        expect([...parseHidden(" nitro , billing ")]).toEqual(["nitro", "billing"]);
    });

    it("küçük harfe çevirir", () => {
        expect([...parseHidden("Nitro,BILLING")]).toEqual(["nitro", "billing"]);
    });

    it("boş parçaları atar", () => {
        expect([...parseHidden("nitro,,billing,")]).toEqual(["nitro", "billing"]);
    });

    it("tekrarları teke indirir", () => {
        expect(parseHidden("nitro,nitro").size).toBe(1);
    });
});
