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
import { getDefaultKey, shouldSkipModule, wrapModuleFilter } from "./guards";
import { cache, wreq } from "./intercept";
import type { Module, ModuleExports, ModuleFilter } from "./types";

const logger = new Logger("Webpack:Finder", "#8caaee");

export interface FindOptions {
    /** Bulunamazsa uyarı basma (tembel aramaların iç çağrıları için). */
    silent?: boolean;
    /** Varsayılan export'a inme, ham `module.exports`'u döndür. */
    raw?: boolean;
}

/** Bir modülün aranabilir export'ları: ham export ve varsayılan export. */
function* searchableExports(module: Module): Generator<ModuleExports> {
    const { exports } = module;
    if (exports == null) return;

    if (!shouldSkipModule(exports)) yield exports;

    const defaultKey = getDefaultKey(module);
    if (defaultKey == null) return;

    let defaultExport: ModuleExports;
    try {
        defaultExport = exports[defaultKey];
    } catch {
        return;
    }

    if (defaultExport != null && !shouldSkipModule(defaultExport)) yield defaultExport;
}

/**
 * Çalıştırılmış tüm modüller üzerinde arama yapar.
 *
 * `raw: true` ise eşleşen modülün ham `exports`'u döner; aksi halde filtreyi
 * sağlayan export (varsayılan export dahil) döner.
 */
export function find<T = ModuleExports>(filter: ModuleFilter, options: FindOptions = {}): T | null {
    const wrapped = wrapModuleFilter(filter);

    for (const moduleId in cache) {
        const module = cache[moduleId];
        if (module?.exports == null) continue;

        for (const exports of searchableExports(module)) {
            if (!wrapped(exports, module, moduleId)) continue;
            return (options.raw ? module.exports : exports) as T;
        }
    }

    if (!options.silent) {
        logger.warn(`Modül bulunamadı: ${describeFilter(filter)}`);
    }

    return null;
}

/** Filtreyi sağlayan tüm export'lar. */
export function findAll<T = ModuleExports>(filter: ModuleFilter): T[] {
    const wrapped = wrapModuleFilter(filter);
    const results: T[] = [];

    for (const moduleId in cache) {
        const module = cache[moduleId];
        if (module?.exports == null) continue;

        for (const exports of searchableExports(module)) {
            if (wrapped(exports, module, moduleId)) results.push(exports as T);
        }
    }

    return results;
}

/** Eşleşen modülün id'si — patch hedefi ararken ve reporter'da kullanılıyor. */
export function findModuleId(filter: ModuleFilter, options: FindOptions = {}): PropertyKey | null {
    const wrapped = wrapModuleFilter(filter);

    for (const moduleId in cache) {
        const module = cache[moduleId];
        if (module?.exports == null) continue;

        for (const exports of searchableExports(module)) {
            if (wrapped(exports, module, moduleId)) return moduleId;
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
    if (wreq?.m == null) return null;

    for (const moduleId in wreq.m) {
        let source: string;
        try {
            source = String(wreq.m[moduleId]);
        } catch {
            continue;
        }

        if (strings.every(str => source.includes(str))) return moduleId;
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
