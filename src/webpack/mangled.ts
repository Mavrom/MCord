/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Logger } from "../utils/logger";
import { bySource, describeFilter } from "./filters";
import { find } from "./finder";
import { lazyWebpackSearchHistory } from "./intercept";
import type { ModuleExports, ModuleFilter } from "./types";

const logger = new Logger("Webpack:Mangled", "#8caaee");

/**
 * Discord minify sırasında property adlarını mangle ediyor: `getUser` yerine
 * `Z8`, `n5` gibi adlar kalıyor. Mapper'lar bu adları *değerine* bakarak
 * bulur ve okunabilir adlara bağlar (plan §4.7).
 */
export type Mapper = (value: ModuleExports, key?: any, exports?: any) => boolean;

export type MappedModule<M extends Record<string, Mapper>> = {
    [K in keyof M]: ModuleExports;
};

/**
 * Filtreyle bulunan modüldeki mangle edilmiş property'leri okunabilir adlara
 * bağlar. Dönen nesne getter'larla gerçek property'lere proxy'ler — böylece
 * modül sonradan değişse bile bağ kopmuyor.
 *
 * Her çağrı `lazyWebpackSearchHistory`'ye kaydediliyor ve CI'da doğrulanıyor;
 * bir mapper Discord güncellemesinde kırılırsa reporter yakalıyor
 * (plan §4.7, §9.1).
 */
export function mapMangledModule<M extends Record<string, Mapper>>(
    target: string | ModuleFilter,
    mappers: M,
    options: { silent?: boolean } = {}
): MappedModule<M> {
    // String de kabul ediyoruz: modülün **ham kaynağında** aranır, böylece
    // henüz çalıştırılmamış modüller de bulunur (plan §4.4).
    const filter = typeof target === "string" ? bySource(target) : target;

    if (IS_REPORTER) lazyWebpackSearchHistory.push(["mapMangledModule", [filter, mappers]]);

    const result = {} as MappedModule<M>;
    const exports = find(filter, { raw: true, silent: true });

    if (exports == null) {
        if (!options.silent) {
            logger.warn(`mapMangledModule: modül bulunamadı — ${describeFilter(filter)}`);
        }
        return result;
    }

    for (const mapperName in mappers) {
        const mapper = mappers[mapperName];
        let found = false;

        for (const key in exports) {
            let value: ModuleExports;
            try {
                value = exports[key];
            } catch {
                continue;
            }

            let matched = false;
            try {
                matched = mapper(value, key, exports);
            } catch {
                continue;
            }

            if (!matched) continue;

            Object.defineProperty(result, mapperName, {
                enumerable: true,
                configurable: true,
                get: () => exports[key],
                set: newValue => { exports[key] = newValue; }
            });

            found = true;
            break;
        }

        if (!found && !options.silent) {
            logger.warn(`mapMangledModule: "${mapperName}" eşleşmedi — ${describeFilter(filter)}`);
        }
    }

    return result;
}

/** Erişildiği anda çözülen tembel sürüm. */
export function mapMangledModuleLazy<M extends Record<string, Mapper>>(
    target: string | ModuleFilter,
    mappers: M
): MappedModule<M> {
    const filter = typeof target === "string" ? bySource(target) : target;

    if (IS_REPORTER) lazyWebpackSearchHistory.push(["mapMangledModuleLazy", [filter, mappers]]);

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
