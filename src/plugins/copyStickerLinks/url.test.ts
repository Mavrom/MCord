/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { describe, expect, it } from "vitest";

import { getStickerUrl } from "./url";

describe("getStickerUrl", () => {
    it("PNG ve APNG çıkartmaları CDN'e yönlendirir", () => {
        expect(getStickerUrl({ id: "1", format_type: 1 })).toContain("/stickers/1.png");
        expect(getStickerUrl({ id: "2", format_type: 2 })).toContain("/stickers/2.png");
    });

    it("Lottie çıkartmalarını JSON olarak üretir", () => {
        expect(getStickerUrl({ id: "3", format_type: 3 })).toContain("/stickers/3.json");
    });

    it("GIF çıkartmalarını medya proxy'sine yönlendirir", () => {
        expect(getStickerUrl(
            { id: "4", format_type: 4 },
            { mediaProxyEndpoint: "//media.example.test" }
        )).toBe("https://media.example.test/stickers/4.gif?size=512&lossless=true");
    });

    it("bilinmeyen biçimi reddeder", () => {
        expect(getStickerUrl({ id: "5", format_type: 0 })).toBeNull();
    });
});
