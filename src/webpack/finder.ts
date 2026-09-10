/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Logger } from "../utils/logger";
import {
    byDisplayName,
    byKeys,
    byPrototypeKeys,
    bySource,
    byStoreName,
    byStrings,
    describeFilter
} from "./filters";
import { allWebpackInstances, cache, wreq } from "./intercept";
import { FilterSymbol, type ModuleExports, type ModuleFilter } from "./types";

const logger = new Logger("Webpack:Finder", "#8caaee");

export interface FindOptions {
    /** Bulunamazsa uyarı basma (tembel aramaların iç çağrıları için). */
    silent?: boolean;
    /** Varsayılan export'a inme, ham `module.exports`'u döndür. */
    raw?: boolean;
}

/**
 * Modül cache anahtarları — **`for...in`, yani yalnız enumerable olanlar**.
 *
 * Bu kritik: `_blacklistBadModules` (Vencord'dan port, `intercept.ts`) zehirli
 * modülleri ve export'ları `wreq.c` içinde non-enumerable yaparak eliyor —
 * Discord'un i18n mesaj Proxy'si dahil; o proxy sorulan her anahtara değer
 * döndürdüğü için `byKeys(["createElement",…])` gibi HER filtreyi sahte olarak
 * sağlıyor.
 *
 * Bir ara buradan `Object.getOwnPropertyNames`'e geçilmişti; bu, karalistenin
 * tamamını devre dışı bıraktı. Sonuç: `React` i18n proxy'sine çözüldü,
 * `React.createElement(...)` bir `{locale, ast}` çeviri nesnesi döndürdü, React
 * onu render edemedi (hata #31) ve **Discord siyah ekran açıldı**.
 * Vencord'un döngüsünden ayrılma.
 */
function cacheKeys(): string[] {
    const keys: string[] = [];
    for (const key in cache ?? {}) keys.push(key);
    return keys;
}

/** Bir modülün export anahtarları — yine yalnız enumerable (karaliste geçerli). */
function ownKeys(obj: any): string[] {
    const keys: string[] = [];
    try {
        for (const key in obj) keys.push(key);
    } catch { /* erişilemiyor */ }
    return keys;
}

/** Filtreyi güvenli çağırır — filtre fırlatırsa `false` (hangi modülün eşleştiğini değiştirmez). */
function safe(filter: ModuleFilter): (v: any) => boolean {
    return (v: any) => {
        try {
            return (filter as (m: any) => boolean)(v);
        } catch {
            return false;
        }
    };
}

/**
 * Çalıştırılmış tüm modüller üzerinde arama yapar — kanıtlanmış açık-kaynak
 * istemcinin (Vencord) `find`'iyle birebir aynı döngü.
 *
 * `raw: true` ise eşleşen modülün ham `exports`'u döner; aksi halde filtreyi
 * sağlayan (iç içe) export döner.
 */
export function find<T = ModuleExports>(filter: ModuleFilter, options: FindOptions = {}): T | null {
    const wrapped = safe(filter);

    // `bySource` **ham fabrika kaynağına** bakıyor: cache'te olmayan / henüz
    // çalıştırılmamış modülleri de bulmalı. Vencord'un yolu: `findModuleId`
    // (wreq.m kaynak taraması) + `wreq(id)`.
    const meta = filter[FilterSymbol] ?? filter.__originalFilter?.[FilterSymbol];
    if (meta?.name === "bySource") {
        const codes = (meta.args ?? []).filter((a: unknown) => typeof a === "string" || a instanceof RegExp) as Array<string | RegExp>;
        const id = codes.length > 0 ? findModuleIdBySource(...codes) : null;
        if (id == null) {
            if (!options.silent) logger.warn(`Modül bulunamadı: ${describeFilter(filter)}`);
            return null;
        }
        try {
            return wreq(id as any) as T;
        } catch {
            return null;
        }
    }

    for (const key of cacheKeys()) {
        const mod = (cache as any)[key];
        // NOT: Vencord `!mod?.loaded` da kontrol ediyor. Bizde patch'lenmiş
        // fabrikaların bir kısmı fırlattığı için `loaded` false kalıyor ama
        // export'lar kullanılabilir oluyor — o yüzden yalnız `exports` şartı.
        if (mod?.exports == null) continue;

        if (wrapped(mod.exports)) return mod.exports as T;

        if (typeof mod.exports !== "object") continue;

        for (const nestedMod of ownKeys(mod.exports)) {
            let nested: any;
            try { nested = mod.exports[nestedMod]; } catch { continue; }
            if (nested && wrapped(nested)) {
                return (options.raw ? mod.exports : nested) as T;
            }
        }
    }

    if (!options.silent) {
        logger.warn(`Modül bulunamadı: ${describeFilter(filter)}`);
    }

    return null;
}

/** Filtreyi sağlayan tüm export'lar (Vencord `findAll` döngüsü). */
export function findAll<T = ModuleExports>(filter: ModuleFilter): T[] {
    const wrapped = safe(filter);
    const results: T[] = [];

    for (const key of cacheKeys()) {
        const mod = (cache as any)[key];
        // NOT: Vencord `!mod?.loaded` da kontrol ediyor. Bizde patch'lenmiş
        // fabrikaların bir kısmı fırlattığı için `loaded` false kalıyor ama
        // export'lar kullanılabilir oluyor — o yüzden yalnız `exports` şartı.
        if (mod?.exports == null) continue;

        if (wrapped(mod.exports)) results.push(mod.exports as T);
        if (typeof mod.exports !== "object") continue;

        for (const nestedMod of ownKeys(mod.exports)) {
            let nested: any;
            try { nested = mod.exports[nestedMod]; } catch { continue; }
            if (nested && wrapped(nested)) results.push(nested as T);
        }
    }

    return results;
}

/** Eşleşen modülün id'si — patch hedefi ararken ve reporter'da kullanılıyor. */
export function findModuleId(filter: ModuleFilter, options: FindOptions = {}): PropertyKey | null {
    const wrapped = safe(filter);

    for (const key of cacheKeys()) {
        const mod = (cache as any)[key];
        // NOT: Vencord `!mod?.loaded` da kontrol ediyor. Bizde patch'lenmiş
        // fabrikaların bir kısmı fırlattığı için `loaded` false kalıyor ama
        // export'lar kullanılabilir oluyor — o yüzden yalnız `exports` şartı.
        if (mod?.exports == null) continue;

        if (wrapped(mod.exports)) return key;
        if (typeof mod.exports !== "object") continue;

        for (const nestedMod of ownKeys(mod.exports)) {
            let nested: any;
            try { nested = mod.exports[nestedMod]; } catch { continue; }
            if (nested && wrapped(nested)) return key;
        }
    }

    if (!options.silent) {
        logger.warn(`Modül id'si bulunamadı: ${describeFilter(filter)}`);
    }

    return null;
}

/**
 * Henüz çalıştırılmamış modüller dahil, ham fabrika kaynağında arama.
 *
 * `bySource` filtresi zaten kaynağa bakıyor; burada `cache` yerine `wreq.m`
 * üzerinde geziyoruz çünkü modül hiç require edilmemiş olabilir (plan §4.4).
 */
/** Vencord `stringMatches`: string veya RegExp parçalarının hepsi eşleşiyor mu. */
function sourceMatches(source: string, parts: Array<string | RegExp>): boolean {
    return parts.every(part => {
        if (typeof part === "string") return source.includes(part);
        if (part.global) part.lastIndex = 0;
        return part.test(source);
    });
}

export function findModuleIdBySource(...strings: Array<string | RegExp>): PropertyKey | null {
    // Tek `wreq` yetmiyor: Discord'da birden fazla webpack instance'ı var ve
    // aradığımız modül başka bir instance'ın fabrika listesinde olabilir.
    for (const instance of new Set([wreq, ...allWebpackInstances])) {
        const factories = instance?.m;
        if (factories == null) continue;

        for (const moduleId in factories) {
            let source: string;
            try {
                source = String(factories[moduleId]);
            } catch {
                continue;
            }

            if (sourceMatches(source, strings)) return moduleId;
        }
    }

    return null;
}

/** Modülü id ile require eder — `findModuleIdBySource` ile birlikte kullanılır. */
export function requireModule<T = ModuleExports>(moduleId: PropertyKey): T | null {
    if (wreq == null) return null;

    try {
        return wreq(moduleId) as T;
    } catch (err) {
        logger.error(`Modül ${String(moduleId)} require edilemedi:\n`, err);
        return null;
    }
}

// ── Kısayollar ───────────────────────────────────────────────────────────────

export const findByKeys = <T = ModuleExports>(...props: string[]) =>
    find<T>(byKeys(props));

export const findByStrings = <T = ModuleExports>(...strings: string[]) =>
    find<T>(byStrings(...strings));

export const findBySource = <T = ModuleExports>(...strings: string[]) =>
    find<T>(bySource(...strings));

export const findByPrototypeKeys = <T = ModuleExports>(...fields: string[]) =>
    find<T>(byPrototypeKeys(fields));

export const findByDisplayName = <T = ModuleExports>(name: string) =>
    find<T>(byDisplayName(name));

export const findStore = <T = ModuleExports>(name: string) =>
    find<T>(byStoreName(name), { silent: true });
