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
 * Filtreyi güvenli çağıran sarmalayıcı — filtre fırlatırsa `false`.
 * (Kanıtlanmış açık-kaynak istemcinin `find`'i filtreyi çıplak çağırıyor;
 * biz sadece try/catch ekliyoruz, `shouldSkipModule`/token-guard katmanını
 * KALDIRDIK — o katman ChannelStore gibi Proxy-tabanlı store'ları eliyordu.)
 */
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

    // `bySource` sadece `moduleId`'ye bakıyor — modül başına tek çağrı (perf).
    const isSourceFilter = (filter[FilterSymbol] ?? filter.__originalFilter?.[FilterSymbol])?.name === "bySource";

    for (const key in cache) {
        const mod = cache[key] as any;
        if (!mod?.loaded || mod.exports == null) continue;

        if (isSourceFilter) {
            if ((filter as any)(mod.exports, mod, key)) return mod.exports as T;
            continue;
        }

        if (wrapped(mod.exports)) return mod.exports as T;

        if (typeof mod.exports !== "object") continue;

        for (const nestedMod in mod.exports) {
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

    for (const key in cache) {
        const mod = cache[key] as any;
        if (!mod?.loaded || mod.exports == null) continue;

        if (wrapped(mod.exports)) results.push(mod.exports as T);
        if (typeof mod.exports !== "object") continue;

        for (const nestedMod in mod.exports) {
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

    for (const key in cache) {
        const mod = cache[key] as any;
        if (!mod?.loaded || mod.exports == null) continue;

        if (wrapped(mod.exports)) return key;
        if (typeof mod.exports !== "object") continue;

        for (const nestedMod in mod.exports) {
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
export function findModuleIdBySource(...strings: string[]): PropertyKey | null {
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

            if (strings.every(str => source.includes(str))) return moduleId;
        }
    }

    logger.warn(`Kaynakta bulunamadı: ${strings.join(", ")}`);
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
    find<T>(byStoreName(name));
