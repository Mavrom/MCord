/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Logger } from "../utils/logger";
import type { Module, ModuleExports, ModuleFilter } from "./types";

const logger = new Logger("Webpack:Guards", "#8caaee");

/** `Object.getPrototypeOf(Int8Array)` — tüm typed array'lerin ortak atası. */
const TypedArray = Object.getPrototypeOf(Int8Array) as new () => object;

/**
 * Aynı filtre defalarca patlarsa konsolu spam'lemiyoruz, sadece ilkinde uyarıyoruz.
 * `WeakSet` — filtre çöp toplanınca kayıt da gidiyor.
 */
const hasThrown = new WeakSet<ModuleFilter>();

/**
 * Modül filtresini güvenlik ve dayanıklılık katmanıyla sarar (plan §4.3).
 *
 * Kendi pluginlerimizi yazıyor olsak bile `getToken`/`getEmail`/`showToken`
 * filtresi gerekli: bir hata sonucu token'ın loglanmasını veya bir arama
 * sonucunda açığa çıkmasını engelliyor. Savunma katmanı ucuz (plan §13).
 */
export function wrapModuleFilter(filter: ModuleFilter): ModuleFilter {
    const wrapped = (exports: ModuleExports, module: Module, moduleId: PropertyKey): boolean => {
        try {
            if (exports instanceof Window) return false;

            // Map/Set benzeri nesneler — arama sırasında sonsuz özyineleme yapıyor.
            if (
                exports?.default?.remove && exports?.default?.set && exports?.default?.clear
                && exports?.default?.get && !exports?.default?.sort
            ) return false;

            if (exports.remove && exports.set && exports.clear && exports.get && !exports.sort) {
                return false;
            }

            // GÜVENLİK: token/email erişimini komple engelle.
            if (exports?.default?.getToken || exports?.default?.getEmail || exports?.default?.showToken) {
                return false;
            }
            if (exports.getToken || exports.getEmail || exports.showToken) return false;

            return filter(exports, module, moduleId);
        } catch (error) {
            if (!hasThrown.has(filter)) {
                logger.warn("Modül filtresi hata fırlattı.", error);
                hasThrown.add(filter);
            }
            return false;
        }
    };

    return Object.assign(wrapped, filter, { __originalFilter: filter }) as ModuleFilter;
}

/**
 * Aramada tamamen atlanacak export'lar (plan §4.3).
 *
 * DOM nesneleri, typed array'ler ve Discord'un loader sarmalayıcıları arama
 * sırasında sonsuz özyinelemeye veya DOM sızıntısına yol açıyor.
 */
export function shouldSkipModule(exports: ModuleExports): boolean {
    if (!(typeof exports === "object" || typeof exports === "function")) return true;
    if (!exports) return true;
    if (exports.TypedArray) return true;
    if (exports === window) return true;
    if (exports === document.documentElement) return true;
    if (exports[Symbol.toStringTag] === "DOMTokenList") return true;
    if (exports === Symbol) return true;
    if (exports instanceof Window) return true;
    if (exports instanceof TypedArray) return true;
    if ((exports.$$loader && exports.$$baseObject) || (exports.Z?.$$loader && exports.Z?.$$baseObject)) return true;
    return false;
}

/**
 * Discord modülleri üç farklı varsayılan export konvansiyonu kullanıyor.
 *
 * Bu sıralama zaman içinde değişiyor — Discord'un build araçları güncellendikçe
 * yeni harf gelebilir. **Tek bir yerde tut, dağıtma** (plan §4.5).
 */
export function getDefaultKey(module: Module): string | undefined {
    if ("A" in module.exports) return "A";
    if ("Ay" in module.exports) return "Ay";
    if (module.exports.__esModule && "default" in module.exports) return "default";
    return undefined;
}
