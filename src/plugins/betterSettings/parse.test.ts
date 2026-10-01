/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { describe, expect, it } from "vitest";

import { isHiddenKey, parseHidden } from "./parse";

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

describe("BetterSettings / isHiddenKey", () => {
    const hidden = parseHidden("billing,nitro,gift_sidebar_item,user,account");

    it("kısa ad bölümü ve kenar çubuğu öğesini kapsar", () => {
        expect(isHiddenKey("billing_section", hidden)).toBe(true);
        expect(isHiddenKey("nitro_sidebar_item", hidden)).toBe(true);
    });

    it("tam anahtar birebir eşleşir", () => {
        expect(isHiddenKey("gift_sidebar_item", hidden)).toBe(true);
    });

    it("panel ve kategori düğümlerine dokunmaz", () => {
        expect(isHiddenKey("nitro_panel", hidden)).toBe(false);
        expect(isHiddenKey("billing_panel", hidden)).toBe(false);
    });

    it("varsayılan açılış yolunu korur", () => {
        expect(isHiddenKey("user_section", hidden)).toBe(false);
        expect(isHiddenKey("account_sidebar_item", hidden)).toBe(false);
    });

    it("anahtarsız düğümler ve boş liste gizlenmez", () => {
        expect(isHiddenKey(undefined, hidden)).toBe(false);
        expect(isHiddenKey("billing_section", new Set())).toBe(false);
    });
});
