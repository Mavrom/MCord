/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { describe, expect, it } from "vitest";

import { unindent } from "./unindent";

describe("unindent", () => {
    it("ortak baştaki girintiyi kaldırır", () => {
        expect(unindent("    a\n    b\n    c")).toBe("a\nb\nc");
    });

    it("göreli girintiyi korur", () => {
        expect(unindent("    a\n        b\n    c")).toBe("a\n    b\nc");
    });

    it("boş satırları girinti hesabına katmaz", () => {
        expect(unindent("    a\n\n    b")).toBe("a\n\nb");
    });

    it("girinti yoksa dokunmaz", () => {
        expect(unindent("a\nb")).toBe("a\nb");
    });

    it("tek satıra dokunmaz", () => {
        expect(unindent("    merhaba")).toBe("merhaba");
    });

    it("kod bloğunun içini olduğu gibi bırakır", () => {
        const input = "    metin\n    ```\n        kod\n    ```\n    son";
        // Blok öncesi ve sonrası metin bağımsız olarak girinti kaybeder; blok içi dokunulmaz.
        expect(unindent(input)).toBe("metin\n```\n        kod\n    ```\nson");
    });
});
