/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Logger } from "../utils/logger";
import { bySource, describeFilter } from "./filters";
import { findModuleIdBySource } from "./finder";
import { pushSearchHistory, wreq } from "./intercept";
import type { ModuleExports, ModuleFilter } from "./types";

const logger = new Logger("Webpack:Mangled", "#8caaee");

/**
 * Discord minify sırasında property adlarını mangle ediyor: `getUser` yerine
 * `Z8`, `n5` gibi adlar kalıyor. Mapper'lar bu adları *değerine* bakarak
 * bulur ve okunabilir adlara bağlar.
 */
export type Mapper = (value: ModuleExports, key?: any, exports?: any) => boolean;

export type MappedModule<M extends Record<string, Mapper>> = {
    [K in keyof M]: ModuleExports;
};

/**
 * Kanıtlanmış açık-kaynak istemcinin (Vencord) `getAllPropertyNames`'i.
 *
 * `includeNonEnumerable` şart: `_blacklistBadModules` bazı export'ları
 * (ör. `IntlMessagesProxy`) **non-enumerable** yapıyor; `for...in` onları
 * atlıyor ve `i18n.t` gibi mapper'lar hep kırık görünüyordu.
 */
function getAllPropertyNames(object: Record<PropertyKey, any>, includeNonEnumerable: boolean): Set<PropertyKey> {
    const names = new Set<PropertyKey>();
    const getKeys = includeNonEnumerable ? Object.getOwnPropertyNames : Object.keys;

    do {
        try {
            getKeys(object).forEach(name => name !== "__esModule" && names.add(name));
        } catch { /* erişilemeyen prototip */ }
        object = Object.getPrototypeOf(object);
    } while (object != null);

    return names;
}

/**
 * Filtreyle bulunan modüldeki mangle edilmiş property'leri okunabilir adlara
 * bağlar — kanıtlanmış açık-kaynak istemcinin (Vencord) `mapMangledModule`
 * algoritmasının birebir portu:
 *
 *   1. `findModuleId(...code)` — modülü **ham fabrika kaynağında** bul
 *      (cache/`loaded` durumundan bağımsız).
 *   2. `wreq(id)` — çalıştır ve export'u al.
 *   3. `getAllPropertyNames` ile (non-enumerable dahil) tüm anahtarları gez.
 */
export function mapMangledModule<M extends Record<string, Mapper>>(
    target: string | RegExp | ModuleFilter,
    mappers: M,
    options: { silent?: boolean; includeBlacklistedExports?: boolean } = {}
): MappedModule<M> {
    const filter = (typeof target === "string" || target instanceof RegExp)
        ? bySource(target as any)
        : target;
    pushSearchHistory(["mapMangledModule", [filter, mappers]]);

    const result = {} as MappedModule<M>;

    // Kaynak string'lerini filtreden çıkar (`bySource(...)` argümanları).
    const codes = filterSourceStrings(filter);
    const moduleId = codes.length > 0 ? findModuleIdBySource(...codes) : null;

    if (moduleId == null) {
        if (!options.silent) {
            logger.warn(`mapMangledModule: modül bulunamadı — ${describeFilter(filter)}`);
        }
        return result;
    }

    let mod: any;
    try {
        mod = wreq(moduleId as any);
    } catch (err) {
        if (!options.silent) {
            logger.warn(`mapMangledModule: modül ${String(moduleId)} require edilemedi:`, err);
        }
        return result;
    }
    if (mod == null) return result;

    const keys = getAllPropertyNames(mod, options.includeBlacklistedExports !== false);

    outer:
    for (const key of keys) {
        let member: any;
        try {
            member = mod[key as any];
        } catch {
            continue;
        }

        for (const newName in mappers) {
            let matched = false;
            try {
                matched = mappers[newName](member, key, mod);
            } catch {
                continue;
            }

            if (matched) {
                Object.defineProperty(result, newName, {
                    enumerable: true,
                    configurable: true,
                    get: () => mod[key as any],
                    set: value => { mod[key as any] = value; }
                });
                continue outer;
            }
        }
    }

    if (!options.silent) {
        for (const name in mappers) {
            if (!(name in result)) {
                logger.warn(`mapMangledModule: "${name}" eşleşmedi — ${describeFilter(filter)}`);
            }
        }
    }

    return result;
}

/** `bySource(...)` filtresinin arama string'lerini çıkarır. */
function filterSourceStrings(filter: ModuleFilter): Array<string | RegExp> {
    const meta = (filter as any)[Symbol.for("MCord.Filter")]
        ?? (filter as any).__originalFilter?.[Symbol.for("MCord.Filter")];
    if (meta?.name === "bySource" && Array.isArray(meta.args)) {
        return meta.args.filter((a: unknown) => typeof a === "string" || a instanceof RegExp) as Array<string | RegExp>;
    }
    return [];
}

/** Erişildiği anda çözülen tembel sürüm. */
export function mapMangledModuleLazy<M extends Record<string, Mapper>>(
    target: string | RegExp | ModuleFilter,
    mappers: M
): MappedModule<M> {
    const filter = (typeof target === "string" || target instanceof RegExp)
        ? bySource(target as any)
        : target;
    pushSearchHistory(["mapMangledModuleLazy", [filter, mappers]]);

    let resolved: MappedModule<M> | null = null;

    const resolve = () => {
        resolved ??= mapMangledModule(filter, mappers);
        return resolved;
    };

    return new Proxy({} as MappedModule<M>, {
        get: (_t, prop, receiver) => Reflect.get(resolve(), prop, receiver),
        has: (_t, prop) => Reflect.has(resolve(), prop),
        ownKeys: () => Reflect.ownKeys(resolve()),
        getOwnPropertyDescriptor: (_t, prop) => {
            const descriptor = Reflect.getOwnPropertyDescriptor(resolve(), prop);
            return descriptor && { ...descriptor, configurable: true };
        }
    });
}

// ── Sık kullanılan mapper'lar ────────────────────────────────────────────────

/** Kaynağında verilen stringleri içeren fonksiyon. */
export const mapperByStrings = (...strings: string[]): Mapper =>
    value => {
        if (typeof value !== "function") return false;
        const source = String(value);
        return strings.every(str => source.includes(str));
    };

/** Verilen anahtarlara sahip nesne. */
export const mapperByKeys = (...keys: string[]): Mapper =>
    value => value != null && keys.every(key => value[key] !== undefined);

/** Kaynağında regex eşleşen fonksiyon. */
export const mapperByRegex = (regex: RegExp): Mapper =>
    value => {
        if (typeof value !== "function") return false;
        if (regex.global) regex.lastIndex = 0;
        return regex.test(String(value));
    };
