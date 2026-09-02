/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

export interface StickerUrlInput {
    id: string;
    format_type: number;
}

export interface StickerUrlEnvironment {
    cdnHost?: string;
    mediaProxyEndpoint?: string;
}

function withHttps(value: string | undefined, fallback: string): string {
    const base = value || fallback;
    if (base.startsWith("//")) return `https:${base}`;
    if (/^https?:\/\//.test(base)) return base;
    return `https://${base}`;
}

export function getStickerUrl(
    sticker: StickerUrlInput,
    environment: StickerUrlEnvironment = {}
): string | null {
    if (!sticker.id) return null;

    if (sticker.format_type === 4) {
        const base = withHttps(environment.mediaProxyEndpoint, "media.discordapp.net");
        return `${base}/stickers/${sticker.id}.gif?size=512&lossless=true`;
    }

    const extension = sticker.format_type === 3
        ? "json"
        : sticker.format_type === 1 || sticker.format_type === 2
            ? "png"
            : null;
    if (!extension) return null;

    const base = withHttps(environment.cdnHost, "cdn.discordapp.com");
    return `${base}/stickers/${sticker.id}.${extension}?size=512&lossless=true`;
}
