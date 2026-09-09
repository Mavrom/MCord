/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Logger } from "../utils/logger";
import { byCode, byKeys, byStoreName, componentByCode, describeFilter } from "./filters";
import { find, type FindOptions } from "./finder";
import { shouldSkipModule } from "./guards";
import { cache, moduleListeners, pushSearchHistory } from "./intercept";
import { getStoreLazy, resolveStore } from "./stores";
import type { Module, ModuleExports, ModuleFilter } from "./types";

const logger = new Logger("Webpack:Lazy", "#8caaee");

/** Reporter için arama kaydı — CI'da hepsi yeniden çalıştırılır (plan §9.1). */
function record(kind: string, filter: ModuleFilter): void {
    pushSearchHistory([kind, [filter]]);
}

/**
 * Filtreyi **modül kapsamında** CI reporter'a kaydeder ve aynen geri döndürür.
 *
 * Neden gerekli: `lazyWebpackSearchHistory` yalnız arama çağrıldığında dolar.
 * `start()` içindeki `waitFor`'lar ancak plugin etkinse çalışıyor, reporter ise
 * (kanıtlanmış açık-kaynak istemcide olduğu gibi) varsayılan-kapalı pluginleri
 * başlatmıyor — o yüzden bu aramalar CI'da hiç denenmiyordu. Filtreyi modül
 * kapsamında kaydedersek plugin kapalıyken bile doğrulanıyor.
 *
 *     const HANG_STATUS = reportFinder(byKeys(["setHangStatus"]));
 *     // start(): waitFor(HANG_STATUS, …, { silent: true })
 *
 * Çalışma zamanında hiçbir arama yapmaz; yalnızca kaydı ekler.
 */
export function reportFinder(filter: ModuleFilter): ModuleFilter {
    // "findLazy" olarak kaydediyoruz: reporter'ın yeniden çalıştırıcısı bu türü
    // `find(filter)` diye deniyor — tam istediğimiz doğrulama.
    pushSearchHistory(["findLazy", [filter]]);
    return filter;
}

/**
 * Modül henüz yüklenmemişse yüklendiğinde haber verir.
 *
 * Discord'un modüllerinin büyük kısmı tembel yükleniyor; plugin başlatılırken
 * aradığı modül henüz var olmayabilir.
 */
export function waitFor(
    filter: ModuleFilter,
    callback: (exports: ModuleExports, module: Module) => void,
    options: { silent?: boolean } = {}
): () => void {
    // Kanıtlanmış açık-kaynak istemci gibi filtreyi çıplak çağırıyoruz
    // (yalnız try/catch); `shouldSkipModule`/token-guard katmanı store'ları
    // eliyordu.
    const wrapped = (v: any) => {
        try {
            return (filter as (m: any) => boolean)(v);
        } catch {
            return false;
        }
    };

    // Önce zaten yüklenmiş modüllere bak.
    const existing = find(filter, { silent: true });
    if (existing != null) {
        callback(existing, { id: "", loaded: true, exports: existing });
        return () => { };
    }

    let done = false;

    const listener = (exports: ModuleExports, module: Module) => {
        if (done || exports == null) return;

        for (const candidate of candidates(module)) {
            if (!wrapped(candidate)) continue;

            done = true;
            moduleListeners.delete(listener);

            try {
                callback(candidate, module);
            } catch (err) {
                logger.error(`waitFor geri çağrısında hata (${describeFilter(filter)}):\n`, err);
            }
            return;
        }
    };

    moduleListeners.add(listener);

    if (!options.silent) record("waitFor", filter);

    return () => {
        done = true;
        moduleListeners.delete(listener);
    };
}

/** Ham export + tüm iç içe export'lar (Vencord waitFor'un taradığı küme). */
function* candidates(module: Module): Generator<ModuleExports> {
    const { exports } = module;
    if (exports == null) return;

    yield exports;
    if (typeof exports !== "object") return;

    for (const key in exports) {
        let nested: ModuleExports;
        try {
            nested = exports[key];
        } catch {
            continue;
        }

        if (nested != null && !shouldSkipModule(nested)) yield nested;
    }
}

/** Modül yüklenene kadar bekleyen Promise sürümü. */
export function getLazy<T = ModuleExports>(
    filter: ModuleFilter,
    options: { timeout?: number } = {}
): Promise<T | null> {
    record("getLazy", filter);

    return new Promise(resolve => {
        let timer: ReturnType<typeof setTimeout> | undefined;

        const unsubscribe = waitFor(filter, exports => {
            if (timer != null) clearTimeout(timer);
            resolve(exports as T);
        }, { silent: true });

        if (options.timeout != null) {
            timer = setTimeout(() => {
                unsubscribe();
                logger.warn(`getLazy zaman aşımı: ${describeFilter(filter)}`);
                resolve(null);
            }, options.timeout);
        }
    });
}

/**
 * Erişildiği anda aramayı yapan tembel proxy.
 *
 * Plugin'ler modülleri modül kapsamında (`const X = findLazy(...)`) tanımlayıp
 * `start()` içinde kullanabilsin diye. Arama, ilk özellik erişiminde yapılır.
 */
export function findLazy<T extends object = ModuleExports>(
    filter: ModuleFilter,
    options: FindOptions = {}
): T {
    record("findLazy", filter);

    let resolved: any;
    let attempted = false;

    const resolve = () => {
        if (!attempted) {
            attempted = true;
            resolved = find(filter, { silent: true, ...options });
            if (resolved == null) {
                logger.warn(`findLazy çözümlenemedi: ${describeFilter(filter)}`);
            }
        }
        return resolved;
    };

    return new Proxy({} as T, {
        get(_target, prop, receiver) {
            const value = resolve();
            if (value == null) return undefined;
            return Reflect.get(value, prop, receiver);
        },
        set(_target, prop, newValue) {
            const value = resolve();
            if (value == null) return false;
            return Reflect.set(value, prop, newValue);
        },
        has(_target, prop) {
            const value = resolve();
            return value != null && Reflect.has(value, prop);
        },
        ownKeys() {
            const value = resolve();
            return value == null ? [] : Reflect.ownKeys(value);
        },
        getOwnPropertyDescriptor(_target, prop) {
            const value = resolve();
            if (value == null) return undefined;
            const descriptor = Reflect.getOwnPropertyDescriptor(value, prop);
            // Proxy değişmezleri: hedefte olmayan bir özellik configurable olmalı.
            return descriptor && { ...descriptor, configurable: true };
        },
        apply(_target, thisArg, args) {
            const value = resolve();
            return Reflect.apply(value, thisArg, args);
        }
    });
}

/**
 * Flux store'u **adına göre** bekler.
 *
 * Önce Flux'un statik store kaydına (`Flux.Store.getAll()`), sonra webpack
 * araması olarak `constructor.displayName` / `getName()` eşleşmesine bakıyor —
 * kanıtlanmış açık-kaynak istemcinin `findStore` yaklaşımının aynısı.
 */
export function waitForStore(name: string, callback: (store: ModuleExports) => void): () => void {
    pushSearchHistory(["waitForStore", [name]]);

    const fromRegistry = resolveStore(name);
    if (fromRegistry != null) {
        callback(fromRegistry);
        return () => { /* zaten çözüldü */ };
    }

    return waitFor(byStoreName(name), callback, { silent: true });
}

/** Store'a erişildiği anda çözülen tembel proxy. */
export function findStoreLazy<T extends object = ModuleExports>(name: string): T {
    pushSearchHistory(["findStoreLazy", [name]]);
    return getStoreLazy(name) as T;
}

/** Kaynağında verilen stringleri içeren fonksiyonu tembel bulur. */
export function findByCodeLazy<T extends object = ModuleExports>(...code: string[]): T {
    return findLazy<T>(byCode(...code));
}

/** Belirtilen property'lerin hepsine sahip modülü tembel bulur. */
export function findByPropsLazy<T extends object = ModuleExports>(...props: string[]): T {
    return findLazy<T>(byKeys(props));
}

/** Kaynağında verilen stringleri içeren React bileşenini tembel bulur. */
export function findComponentByCodeLazy<T extends object = ModuleExports>(...code: string[]): T {
    return findLazy<T>(componentByCode(...code));
}

/** `module[name]` bileşenini dışa açan modülü bulup o export'a tembel proxy döndürür. */
export function findExportedComponentLazy<T extends object = ModuleExports>(name: string): T {
    const moduleProxy = findLazy<any>(byKeys([name]));

    return new Proxy((() => null) as any, {
        get: (_target, prop) => moduleProxy?.[name]?.[prop],
        apply: (_target, thisArg, args) => Reflect.apply(moduleProxy[name], thisArg, args),
        construct: (_target, args) => Reflect.construct(moduleProxy[name], args)
    }) as T;
}

/** Zaten yüklenmiş modül sayısı — debug/reporter için. */
export function loadedModuleCount(): number {
    return Object.keys(cache ?? {}).length;
}
