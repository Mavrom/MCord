/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { describe, expect, it } from "vitest";

import { reorder } from "./reorder";

describe("PinDMs / reorder", () => {
    it("sabitlenmemişse listeyi değiştirmez", () => {
        expect(reorder(["a", "b", "c"], [], false)).toEqual(["a", "b", "c"]);
    });

    it("sabitleneni başa taşır", () => {
        expect(reorder(["a", "b", "c"], ["c"], false)).toEqual(["c", "a", "b"]);
    });

    it("sabitlenme sırasını korur", () => {
        expect(reorder(["a", "b", "c"], ["c", "a"], false)).toEqual(["c", "a", "b"]);
    });

    it("newestFirst sırayı ters çevirir", () => {
        expect(reorder(["a", "b", "c"], ["c", "a"], true)).toEqual(["a", "c", "b"]);
    });

    it("listede olmayan sabitleneni yok sayar", () => {
        expect(reorder(["a", "b"], ["z", "b"], false)).toEqual(["b", "a"]);
    });

    it("hiçbir öğeyi kaybetmez", () => {
        const input = ["a", "b", "c", "d"];
        expect(reorder(input, ["d", "b"], false).sort()).toEqual(input.sort());
    });
});
