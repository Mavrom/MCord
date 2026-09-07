/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Logger } from "../utils/logger";
import { cache } from "./intercept";

const logger = new Logger("Webpack:Auth", "#8caaee");

/**
 * Discord oturum token'ı.
 *
 * `webpack/guards.ts` normal aramada `getToken`'ı bilerek engelliyor (bir hata
 * sonucu token'ın loglanmaması için). Burada plugin'lerin **açıkça** ihtiyaç
 * duyduğu meşru durum için (kendi API isteğin) token getter'ını buluyoruz.
 * Değer asla loglanmıyor.
 *
 * Yöntem, topluluğun yıllardır kullandığı snippet ile aynı: modül önbelleğinde
 * `exports.default.getToken` (0 argümanlı fonksiyon) olan modülü bul. Bu, intl
 * mesaj proxy'lerini de eler (onlar `.default` altında değil).
 */
let cachedGetToken: (() => string | undefined) | null = null;

function isTokenGetter(fn: any): fn is () => string | undefined {
    return typeof fn === "function" && fn.length === 0;
}

function resolveGetToken(): (() => string | undefined) | null {
    for (const id in cache) {
        const exports = cache[id]?.exports;
        if (exports == null) continue;

        try {
            const def = exports.default;
            if (def != null && isTokenGetter(def.getToken) && "setToken" in def) {
                return def.getToken.bind(def);
            }
        } catch { /* getter patladı — sıradaki */ }
    }

    // `setToken` mangle edilmişse yukarıdaki eleme başarısız olur — sadece
    // `default.getToken` şartıyla ikinci tur.
    for (const id in cache) {
        const exports = cache[id]?.exports;
        try {
            const def = exports?.default;
            if (def != null && isTokenGetter(def.getToken)) {
                return def.getToken.bind(def);
            }
            if (exports != null && isTokenGetter(exports.getToken) && "setToken" in exports) {
                return exports.getToken.bind(exports);
            }
        } catch { /* sıradaki */ }
    }

    // Değer loglamadan tanı: kaç modülde `default.getToken` benzeri anahtar var?
    let withDefault = 0;
    let withGetTokenKey = 0;
    for (const id in cache) {
        try {
            const def = cache[id]?.exports?.default;
            if (def == null || typeof def !== "object") continue;
            withDefault++;
            if ("getToken" in def) withGetTokenKey++;
        } catch { /* sıradaki */ }
    }
    logger.warn(
        `token getter bulunamadı — ${Object.keys(cache).length} modül, ` +
        `${withDefault}'inde default nesnesi, ${withGetTokenKey}'inde getToken anahtarı.`
    );

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
