/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Logger } from "../utils/logger";
import eagerModules from "./eagerModules.json";
import { shouldSkipModule } from "./guards";
import {
    _initWebpack,
    defineInWebpackInstances,
    factoryListeners,
    moduleListeners,
    wreq
} from "./intercept";
import type {
    AnyWebpackRequire,
    Module,
    ModuleExports,
    ModuleFactory,
    PatchedModuleFactory,
    WebpackRequire
} from "./types";

const logger = new Logger("Webpack:Proxy", "#8caaee");

/**
 * Fabrika patch'leyici — Faz 3'te `codePatcher.ts` kendini buraya kaydeder.
 * Kaydedilmediği sürece kimlik fonksiyonu: proxy katmanı tek başına çalışır.
 */
type FactoryPatcher = (moduleId: PropertyKey, factory: ModuleFactory) => PatchedModuleFactory | null;

let factoryPatcher: FactoryPatcher = () => null;

export function setFactoryPatcher(patcher: FactoryPatcher): void {
    factoryPatcher = patcher;
}

/**
 * Eager mod: tüm fabrikalar `wreq.m`'e eklendiği anda patch'lenir (başlangıç
 * maliyeti yüksek, bellek düşük). Lazy mod: fabrika ilk çağrıldığında
 * patch'lenir (plan §11.1).
 *
 * Dev ve reporter'da eager **zorunlu** — tüm dönüşümlerin doğrulanması gerekiyor.
 */
let eagerAll = IS_DEV || IS_REPORTER;

/**
 * Seçici eager (plan §11.1, "bizim eklememiz"):
 * sık kullanılan çekirdek modüller eager, nadir modüller lazy.
 *
 * Liste reporter'ın `patchTimings` verisinden otomatik üretilir; elle
 * doldurulmaz.
 */
const selectiveEagerIds = new Set<string>(
    (eagerModules.moduleIds as unknown as string[]) ?? []
);

export function isEagerPatching(): boolean {
    return eagerAll;
}

/** Kullanıcı ayarını uygular. Dev/reporter'da eager kapatılamaz. */
export function configureEagerPatching(enabled: boolean): void {
    eagerAll = enabled || IS_DEV || IS_REPORTER;
}

function shouldEagerPatch(moduleId: PropertyKey): boolean {
    return eagerAll || selectiveEagerIds.has(String(moduleId));
}

interface FactoryRecord {
    moduleId: PropertyKey;
    original: ModuleFactory;
    /** `undefined` = henüz denenmedi, `null` = patch'e gerek yok. */
    patched?: PatchedModuleFactory | null;
}

const factoryRecords = new WeakMap<ModuleFactory, FactoryRecord>();

const define: typeof Object.defineProperty = (target, prop, descriptor) =>
    Object.defineProperty(target, prop, { configurable: true, writable: true, ...descriptor });

/**
 * Yakalanan bir webpack instance'ını iki katmanlı proxy'ye bağlar (plan §4.2).
 *
 *   wreq.m  ──Proxy(moduleFactoriesHandler)──►  set trap: yeni factory eklendiğinde
 *                                                her factory'yi Proxy'ye sar
 *   factory ──Proxy(moduleFactoryHandler)────►  apply trap: ilk çağrıda patch'le,
 *                                                sonra çalıştır
 */
export function patchThisInstance(this: AnyWebpackRequire): void {
    const instance = this;

    logger.debug("Webpack instance'ı proxy'leniyor.");

    overrideDefineExports(instance);

    const originalFactories = instance.m;
    if (originalFactories == null) return;

    // Yakalamadan önce eklenmiş fabrikaları da sar.
    for (const moduleId of Object.keys(originalFactories)) {
        const factory = originalFactories[moduleId];
        if (factory == null || factoryRecords.has(factory)) continue;
        originalFactories[moduleId] = wrapFactory(moduleId, factory);
    }

    define(instance, "m", { value: new Proxy(originalFactories, moduleFactoriesHandler) });
}

/**
 * `wreq.d` (defineExports) override'ı.
 *
 * Webpack export getter'larını `configurable: false` ile tanımlıyor. Biz
 * `configurable: true` yapıyoruz ki sonradan belirli export'ları
 * `enumerable: false` yaparak aramadan çıkarabilelim (plan §4.2).
 */
function overrideDefineExports(instance: AnyWebpackRequire): void {
    define(instance, "d", {
        value: function (exports: ModuleExports, definition: Record<string, () => ModuleExports>) {
            for (const key in definition) {
                if (!Object.prototype.hasOwnProperty.call(definition, key)) continue;
                if (Object.prototype.hasOwnProperty.call(exports, key)) continue;

                Object.defineProperty(exports, key, {
                    enumerable: true,
                    configurable: true,
                    get: definition[key]
                });
            }
        }
    });
}

const moduleFactoriesHandler: ProxyHandler<WebpackRequire["m"]> = {
    set(target, moduleId, factory: ModuleFactory, receiver) {
        // Zaten sarmalanmışsa (GC geri koyması gibi) dokunma.
        if (typeof factory !== "function" || factoryRecords.has(factory)) {
            return Reflect.set(target, moduleId, factory, receiver);
        }

        notifyFactoryListeners(factory, moduleId);
        return Reflect.set(target, moduleId, wrapFactory(moduleId, factory), receiver);
    },

    // `defineProperty` doğrudan geçer: GC geri koyması ve `enumerable: false`
    // ile aramadan çıkarma bu yoldan gidiyor, tekrar sarmalanmamalı.
    defineProperty(target, moduleId, descriptor) {
        return Reflect.defineProperty(target, moduleId, descriptor);
    }
};

function wrapFactory(moduleId: PropertyKey, originalFactory: ModuleFactory): ModuleFactory {
    const record: FactoryRecord = { moduleId, original: originalFactory };
    factoryRecords.set(originalFactory, record);

    if (shouldEagerPatch(moduleId)) ensurePatched(record);

    const originalSource = String(originalFactory);
    const proxy = new Proxy(originalFactory, moduleFactoryHandler);
    Object.defineProperty(proxy, "toString", {
        value: () => originalSource,
        configurable: true
    });
    factoryRecords.set(proxy, record);

    return proxy;
}

const moduleFactoryHandler: ProxyHandler<ModuleFactory> = {
    apply(originalFactory, thisArg, argArray: Parameters<ModuleFactory>) {
        const record = factoryRecords.get(originalFactory);
        if (record == null) return Reflect.apply(originalFactory, thisArg, argArray);

        return runFactory(record, thisArg, argArray);
    }
};

function ensurePatched(record: FactoryRecord): void {
    if (record.patched !== undefined) return;

    try {
        record.patched = factoryPatcher(record.moduleId, record.original);
    } catch (err) {
        logger.error(`Modül ${String(record.moduleId)} patch'lenirken hata:\n`, err);
        record.patched = null;
    }
}

function runFactory(
    record: FactoryRecord,
    thisArg: unknown,
    argArray: Parameters<ModuleFactory>
): unknown {
    ensurePatched(record);

    const { original } = record;
    const factory = record.patched ?? original;

    let factoryReturn: unknown;
    try {
        factoryReturn = Reflect.apply(factory, thisArg, argArray);
    } catch (err) {
        // Discord'un kendi hatasıysa geçir; bizim patch'imiz kırdıysa orijinali
        // çalıştır. En kötü senaryo: plugin çalışmaz, Discord çalışır (plan §5.6).
        if (factory === original) throw err;

        logger.error(`Patch'lenmiş modül fabrikasında hata (${String(record.moduleId)}):\n`, err);
        factoryReturn = Reflect.apply(original, thisArg, argArray);
    }

    const [module, , require] = argArray;

    // `wreq` yakalanamadıysa ilk çağrılan fabrikanın require argümanından türet
    // (plan §5.6, wreq fallback).
    if (wreq == null && (require as WebpackRequire)?.c != null) {
        _initWebpack(require as WebpackRequire);
    }

    // Bellek: fabrika çalıştı, proxy'ye artık gerek yok. Orijinali geri koyup
    // proxy'yi çöp toplayıcıya bırakıyoruz (plan §4.2, §11.2).
    defineInWebpackInstances(record.moduleId, original);

    if (module?.exports == null) return factoryReturn;

    blacklistBadExports(module.exports);
    notifyModuleListeners(module);

    return factoryReturn;
}

/**
 * Aramaya girmemesi gereken export'ları `enumerable: false` yapar.
 * `wreq.d` override'ı sayesinde descriptor'lar configurable (plan §4.2, §4.3).
 */
function blacklistBadExports(exports: ModuleExports): void {
    if (shouldSkipModule(exports)) return;

    for (const key in exports) {
        let value: unknown;
        try {
            value = exports[key];
        } catch {
            continue;
        }

        if (
            value === window
            || value === document
            || value === document.documentElement
            || (value as any)?.[Symbol.toStringTag] === "DOMTokenList"
        ) {
            const descriptor = Object.getOwnPropertyDescriptor(exports, key);
            if (descriptor?.configurable) {
                Object.defineProperty(exports, key, { ...descriptor, enumerable: false });
            }
        }
    }
}

function notifyFactoryListeners(factory: ModuleFactory, moduleId: PropertyKey): void {
    for (const listener of factoryListeners) {
        try {
            listener(factory, moduleId);
        } catch (err) {
            logger.error("Fabrika dinleyicisinde hata:\n", err);
        }
    }
}

function notifyModuleListeners(module: Module): void {
    for (const listener of moduleListeners) {
        try {
            listener(module.exports, module);
        } catch (err) {
            logger.error("Modül dinleyicisinde hata:\n", err);
        }
    }
}
