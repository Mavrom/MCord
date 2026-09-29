/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../utils/jsx", () => ({
    McordFragment: "fragment",
    McordCreateElement: (_type: unknown, props: { key: string; }, child: unknown) => ({ key: props.key, child })
}));

const { addServerListElement, removeServerListElement, renderServerListElements } = await import("./serverList");

const ids = () => renderServerListElements("above").map((el: { child: string; }) => el.child);

describe("addServerListElement", () => {
    afterEach(() => {
        for (const id of ["a", "b", "cat"]) removeServerListElement("above", id);
    });

    it("eklenme sırasını korur", () => {
        addServerListElement("above", "a", () => "a");
        addServerListElement("above", "b", () => "b");
        expect(ids()).toEqual(["a", "b"]);
    });

    it("first: sonradan eklense de en başa koyar", () => {
        addServerListElement("above", "a", () => "a");
        addServerListElement("above", "b", () => "b");
        addServerListElement("above", "cat", () => "cat", { first: true });
        expect(ids()).toEqual(["cat", "a", "b"]);
    });

    it("first ile yeniden kayıt yinelenen eleman bırakmaz", () => {
        addServerListElement("above", "cat", () => "cat", { first: true });
        addServerListElement("above", "a", () => "a");
        addServerListElement("above", "cat", () => "cat", { first: true });
        expect(ids()).toEqual(["cat", "a"]);
    });
});
