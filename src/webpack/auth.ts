/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { cache } from "./intercept";

/**
 * Discord oturum token'ı.
 *
 * `webpack/guards.ts` normal aramada `getToken`'ı bilerek engelliyor (bir hata
 * sonucu token'ın loglanmaması için). Burada plugin'lerin **açıkça** ihtiyaç
 * duyduğu meşru durum için (kendi API isteğin) `cache`'i doğrudan gezip token
 * getter'ını buluyoruz. Değer asla loglanmıyor.
 */
let cachedGetToken: (() => string | undefined) | null = null;

function resolveGetToken(): (() => string | undefined) | null {
    for (const id in cache) {
        const exports = cache[id]?.exports;
        if (exports == null) continue;

        const candidates: any[] = [exports];
        try {
            if (typeof exports === "object") candidates.push(...Object.values(exports));
        } catch { /* getter patladı */ }

        for (const value of candidates) {
            try {
                if (value && typeof value.getToken === "function" && typeof value.setToken === "function") {
                    return value.getToken.bind(value);
                }
            } catch { /* sıradaki */ }
        }
    }
    return null;
}

export function getDiscordToken(): string | undefined {
    cachedGetToken ??= resolveGetToken();
    try {
        const token = cachedGetToken?.();
        return typeof token === "string" && token.length > 0 ? token : undefined;
    } catch {
        return undefined;
    }
}
