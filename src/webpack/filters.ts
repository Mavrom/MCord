/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { wreq } from "./intercept";
import { FilterSymbol, type ModuleExports, type ModuleFilter } from "./types";

/**
 * Her filtre argümanlarını `Symbol.for("MCord.Filter")` altında saklar —
 * reporter'ın "hangi arama başarısız oldu" mesajını okunabilir üretebilmesi
 * için. Reporter'ın kalitesi buna bağlı (plan §4.4).
 */
function makeFilter(name: string, args: unknown[], fn: ModuleFilter): ModuleFilter {
    return Object.assign(fn, { [FilterSymbol]: { name, args } });
}

/** Bir export'u aranabilir bir string'e çevirir (React sarmalayıcılarını açar). */
export function stringifyExport(exports: ModuleExports): string {
    if (exports == null) return "";

    try {
        if (exports.$$typeof) {
            return String(exports.render ?? exports.type ?? exports);
        }
        return typeof exports === "function" || typeof exports === "object"
            ? String(exports)
            : "";
    } catch {
        return "";
    }
}

/** Export'ta belirtilen tüm anahtarlar var mı. */
export const byKeys = (props: string[]): ModuleFilter =>
    makeFilter("byKeys", props, exports =>
        props.every(prop => exports?.[prop] !== undefined));

/** `prototype` üzerinde belirtilen tüm alanlar var mı. */
export const byPrototypeKeys = (fields: string[]): ModuleFilter =>
    makeFilter("byPrototypeKeys", fields, exports =>
        exports?.prototype != null && fields.every(field => field in exports.prototype));

/** Değerlendirilmiş export'un kaynağı bu stringleri içeriyor mu. */
export const byStrings = (...strings: string[]): ModuleFilter =>
    makeFilter("byStrings", strings, exports => {
        const source = stringifyExport(exports);
        if (!source) return false;
        return strings.every(str => source.includes(str));
    });

/**
 * Ham modül kaynağı (`wreq.m[id].toString()`) bu stringleri içeriyor mu.
 *
 * `bySource` modül **henüz çalıştırılmamışken** kaynağa bakabiliyor;
 * `byStrings` ise değerlendirilmiş export'a bakıyor. İkisi farklı zamanlarda
 * çalışıyor (plan §4.4).
 */
export const bySource = (...strings: string[]): ModuleFilter =>
    makeFilter("bySource", strings, (_exports, _module, moduleId) => {
        const source = getModuleSource(moduleId);
        if (!source) return false;
        return strings.every(str => source.includes(str));
    });

/** Fonksiyon kaynağında regex araması. */
export const byRegex = (regex: RegExp): ModuleFilter =>
    makeFilter("byRegex", [regex], exports => {
        const source = stringifyExport(exports);
        if (!source) return false;
        if (regex.global) regex.lastIndex = 0;
        return regex.test(source);
    });

/** React `displayName` eşleşmesi. */
export const byDisplayName = (name: string): ModuleFilter =>
    makeFilter("byDisplayName", [name], exports =>
        exports?.displayName === name
        || exports?.default?.displayName === name);

/**
 * Fonksiyon **kaynağında** string araması.
 *
 * `byStrings`'ten farkı: React sarmalayıcılarını açmaz, doğrudan `String(f)`.
 * Mangle edilmiş modüllerde mapper olarak kullanılıyor.
 */
export const byCode = (...code: string[]): ModuleFilter =>
    makeFilter("byCode", code, exports => {
        if (typeof exports !== "function") return false;
        const source = Function.prototype.toString.call(exports);
        return code.every(str => source.includes(str));
    });

/** Kaynağında verilen stringleri içeren React bileşeni. */
export const componentByCode = (...code: string[]): ModuleFilter =>
    makeFilter("componentByCode", code, exports => {
        const inner = exports?.$$typeof
            ? (exports.render ?? exports.type ?? exports)
            : exports;

        if (typeof inner !== "function") return false;

        const source = Function.prototype.toString.call(inner);
        return code.every(str => source.includes(str));
    });

/**
 * Flux store eşleşmesi.
 *
 * İki yol: `constructor.displayName` (kanıtlanmış açık-kaynak istemcinin
 * kullandığı — store sınıfı çalıştırılmışsa hep var) ve `getName()` (bizim
 * eski yolumuz, geri uyum). `getName()` bazı store'larda argüman istiyor veya
 * fırlatıyor, o yüzden try/catch şart.
 */
export const byStoreName = (name: string): ModuleFilter =>
    makeFilter("byStoreName", [name], exports => {
        try {
            if (exports?.constructor?.displayName === name) return true;
            if (typeof exports?.getName === "function" && exports.getName.length === 0) {
                return exports.getName() === name;
            }
        } catch { /* bozuk store */ }
        return false;
    });

/** Verilen filtrelerin hepsini sağlayan modüller. */
export const byAll = (...filters: ModuleFilter[]): ModuleFilter =>
    makeFilter("byAll", filters, (exports, module, moduleId) =>
        filters.every(filter => filter(exports, module, moduleId)));

/** `wreq.e("1234")` çağrılarından chunk id'lerini ayıklar. */
export const ChunkIdsRegex = /\("([^"]+?)"\)/g;

/**
 * Fabrika kaynağı önbelleği: `bySource` her modülün **her iç export'u** için
 * çağrılıyor (20 bin modül × ~5 export = ~100 bin çağrı). String'e çevirmeyi
 * modül başına bir kez yapıyoruz — Vencord'un `bySource`/`byFactoryCode`
 * yaklaşımı da aynı: kaynağı bir kez okur, tekrar tekrar tarar.
 */
const moduleSourceCache = new Map<PropertyKey, string>();

/** Ham modül kaynağı — fabrika henüz çalışmamış olsa bile okunabilir. */
export function getModuleSource(moduleId: PropertyKey): string {
    const cached = moduleSourceCache.get(moduleId);
    if (cached !== undefined) return cached;

    const factory = wreq?.m?.[moduleId as any];
    if (factory == null) return "";

    let source: string;
    try {
        source = String(factory);
    } catch {
        source = "";
    }

    moduleSourceCache.set(moduleId, source);
    return source;
}

/** Bir filtrenin insan okunabilir tanımı (reporter için). */
export function describeFilter(filter: ModuleFilter): string {
    const meta = filter[FilterSymbol] ?? filter.__originalFilter?.[FilterSymbol];
    if (!meta) return "<anonim filtre>";

    const args = meta.args
        .map(arg => (typeof arg === "function" ? describeFilter(arg as ModuleFilter) : JSON.stringify(arg)))
        .join(", ");

    return `${meta.name}(${args})`;
}
