/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/*
 * Discord webpack yakalama + fabrika proxy'leme katmanı.
 *
 * Bu dosya, kanıtlanmış açık-kaynak istemci modu `patchWebpack.ts`'inin sadık
 * bir port'u — Discord'un modüllerini bulup patch'lemenin yolunu sıfırdan
 * çözmek yerine, canlıya karşı doğrulanmış mekanizmayı kullanıyoruz.
 *
 * `wreq.m` fabrika nesnesi; hem ön-dolduruluyor hem `webpackGlobal.push` ile
 * besleniyor. `Function.prototype.m` setter'ıyla tanımlandığı anı yakalayıp,
 * hangi webpack instance'ının patch'leneceğine ve fabrikaların nasıl
 * sarmalanacağına karar veren setter'ları kuruyoruz.
 */

import { Logger } from "../utils/logger";
import eagerModules from "./eagerModules.json";
import type {
    AnyWebpackRequire,
    Module,
    ModuleExports,
    ModuleFactory,
    PatchedModuleFactory,
    WebpackRequire
} from "./types";

export const logger = new Logger("Webpack", "#8caaee");

// ── Genel durum ─────────────────────────────────────────────────────────────

let _resolveReady!: () => void;
/** Ana webpack instance'ı yakalandığında çözülür. */
export const onceReady = new Promise<void>(resolve => { _resolveReady = resolve; });

/** Ana webpack instance'ı. Yakalanana kadar `null`. */
export let wreq: WebpackRequire = null!;
/** `wreq.c` — modül önbelleği. */
export let cache: WebpackRequire["c"] = null!;

/** Yakalanan tüm webpack instance'ları (ana instance dahil). */
export const allWebpackInstances = new Set<AnyWebpackRequire>();

/** Bir modül *çalıştırıldığında* export'u üzerinde çalışan dinleyiciler. */
export const moduleListeners = new Set<(exports: ModuleExports, module: Module) => void>();

/** Yeni bir fabrika `wreq.m`'e eklendiğinde çalışan dinleyiciler. */
export const factoryListeners = new Set<(factory: ModuleFactory, moduleId: PropertyKey) => void>();

/** Reporter kaydı: her tembel arama tipi ve argümanları. */
export const lazyWebpackSearchHistory: Array<[string, unknown[]]> = [];

export const SYM_ORIGINAL_MODULE_FACTORIES = Symbol("MCord.originalModuleFactories");
export const SYM_IS_PROXIED_FACTORY = Symbol("MCord.isProxiedFactory");
export const SYM_ORIGINAL_FACTORY = Symbol("MCord.originalFactory");

/** `codePatcher.ts` kendini buraya kaydeder; kayıtlı değilse patch yok. */
type FactoryPatcher = (moduleId: PropertyKey, factory: ModuleFactory) => PatchedModuleFactory | null;
let factoryPatcher: FactoryPatcher = () => null;
export function setFactoryPatcher(patcher: FactoryPatcher): void {
    factoryPatcher = patcher;
}

// ── Eager patch modu ────────────────────────────────────────────────────────

let eagerAll = IS_DEV || IS_REPORTER;
export function isEagerPatching(): boolean {
    return eagerAll;
}
export function configureEagerPatching(enabled: boolean): void {
    eagerAll = enabled || IS_DEV || IS_REPORTER;
}
const selectiveEagerIds = new Set<string>((eagerModules.moduleIds as unknown as string[]) ?? []);
function shouldEagerPatch(moduleId: PropertyKey): boolean {
    return eagerAll || selectiveEagerIds.has(String(moduleId));
}

// ── Yardımcılar ─────────────────────────────────────────────────────────────

export function _initWebpack(webpackRequire: WebpackRequire): void {
    wreq = webpackRequire;
    cache = webpackRequire.c;
    _resolveReady();

    Reflect.defineProperty(webpackRequire.c, Symbol.toStringTag, {
        value: "ModuleCache", configurable: true, writable: true, enumerable: false
    });

    logger.info("Ana webpack instance'ı yakalandı.");
}

/** Fabrikayı tüm yakalanmış instance'larda tanımlar. */
export function defineInWebpackInstances(moduleId: PropertyKey, factory: ModuleFactory): void {
    for (const instance of allWebpackInstances) {
        if (instance.m == null) continue;
        define(instance.m, moduleId, { value: factory });
    }
}

/** Whether we tried the WebpackRequire fallback yet. */
let wreqFallbackApplied = false;

const define: typeof Reflect.defineProperty = (target, p, attributes) => {
    if (Object.hasOwn(attributes, "value")) attributes.writable = true;
    return Reflect.defineProperty(target, p, { configurable: true, enumerable: true, ...attributes });
};

function interpolate(fileName: string | undefined): string {
    return fileName ? ` (${fileName})` : "";
}

// ── Kötü modül elemesi ──────────────────────────────────────────────────────

const TypedArray = Object.getPrototypeOf(Int8Array);
const PROXY_CHECK = "is this a proxy that returns values for any key?";

function shouldIgnoreValue(value: any): boolean {
    if (value == null) return true;
    if (value === window) return true;
    if (value === document || value === document.documentElement) return true;
    if (value[Symbol.toStringTag] === "DOMTokenList" || value[Symbol.toStringTag] === "IntlMessagesProxy") return true;
    if (value[PROXY_CHECK] !== void 0) {
        Reflect.deleteProperty(value, PROXY_CHECK);
        return true;
    }
    if (value instanceof TypedArray) return true;
    return false;
}

function makePropertyNonEnumerable(target: Record<PropertyKey, any>, key: PropertyKey): void {
    const descriptor = Object.getOwnPropertyDescriptor(target, key);
    if (descriptor == null) return;
    Reflect.defineProperty(target, key, { ...descriptor, enumerable: false });
}

export function _blacklistBadModules(
    requireCache: NonNullable<AnyWebpackRequire["c"]>,
    exports: ModuleExports,
    moduleId: PropertyKey
): boolean {
    try {
        if (shouldIgnoreValue(exports)) {
            makePropertyNonEnumerable(requireCache, moduleId);
            return true;
        }
    } catch (err) {
        logger.error("Modül karalistelenirken hata:\n", err, moduleId);
    }

    if (typeof exports !== "object") return false;

    let hasOnlyBadProperties = true;
    for (const exportKey in exports) {
        try {
            let exportValue: any;
            try {
                exportValue = exports[exportKey];
            } catch {
                continue;
            }
            if (shouldIgnoreValue(exportValue)) {
                makePropertyNonEnumerable(exports, exportKey);
            } else {
                hasOnlyBadProperties = false;
            }
        } catch (err) {
            logger.error("Modül karalistelenirken hata:\n", err, moduleId);
        }
    }

    return hasOnlyBadProperties;
}

// ── Katman 2: Yakalama ──────────────────────────────────────────────────────

const BLACKLISTED_ASSETS = ["sentry", "libdiscore", "fast-connect"];

export function initWebpackIntercept(): void {
    define(Function.prototype, "m", {
        enumerable: false,

        set(this: AnyWebpackRequire, originalModules: Record<PropertyKey, ModuleFactory>) {
            define(this, "m", { value: originalModules });
            if (originalModules == null) return;

            // Bu muhtemelen Discord'un ana webpack instance'larından biri mi?
            const { stack } = new Error();
            if (!stack?.includes("http") || stack.match(/at \d+? \(/) || !String(this).includes("exports:{}")) {
                return;
            }

            const fileName = stack.match(/\/assets\/(.+?\.js)/)?.[1];
            if (BLACKLISTED_ASSETS.some(name => fileName?.toLowerCase()?.includes(name))) return;

            const patchThisInstance = () => {
                logger.debug(`Webpack fabrikaları bulundu${interpolate(fileName)}`);
                allWebpackInstances.add(this);

                for (const moduleId in originalModules) {
                    proxyFactoryAndUpdateExisting(originalModules, moduleId, originalModules[moduleId], originalModules, true);
                }

                define(originalModules, Symbol.toStringTag, { value: "ModuleFactories", enumerable: false });
                define(this, "m", { value: new Proxy(originalModules, moduleFactoriesHandler) });

                // `wreq.d` (defineExports) — export getter'larını configurable yap.
                (this as any).d = function (exports: any, definition: Record<string, () => any>) {
                    for (const key in definition) {
                        if (Object.hasOwn(definition, key) && !Object.hasOwn(exports, key)) {
                            Object.defineProperty(exports, key, {
                                enumerable: true, configurable: true, get: definition[key]
                            });
                        }
                    }
                };
            };

            // Yalnız chunk yükleme yeteneği olan instance'larda `wreq.p` var.
            // `/assets/` ile çağrılırsa: patch'lenecek ana instance budur.
            define(this, "p", {
                enumerable: false,
                set(this: AnyWebpackRequire, bundlePath: NonNullable<AnyWebpackRequire["p"]>) {
                    define(this, "p", { value: bundlePath });
                    clearTimeout(bundlePathTimeout);

                    // libdiscore init instance'ı `wreq.u` için sabit string döndürüyor — ele.
                    if (bundlePath !== "/assets/" || /(?:=>|{return)"[^"]+?"[^=]/.exec(String((this as any).u))) {
                        return;
                    }

                    if (wreq == null && this.c != null) {
                        logger.info(`Ana webpack instance'ı bulundu${interpolate(fileName)}`);
                        _initWebpack(this as WebpackRequire);
                    }

                    patchThisInstance();
                }
            });

            // Eski sentry benzeri: `wreq.O` var ama `wreq.p` yok.
            define(this, "O", {
                enumerable: false,
                set(this: AnyWebpackRequire, onChunksLoaded: NonNullable<AnyWebpackRequire["O"]>) {
                    define(this, "O", { value: onChunksLoaded });
                    clearTimeout(onChunksLoadedTimeout);

                    const instance = this;
                    define(onChunksLoaded as any, "j", {
                        enumerable: false,
                        set(this: any, j: any) {
                            define(this, "j", { value: j });
                            if (instance.p == null) patchThisInstance();
                        }
                    });
                }
            });

            const bundlePathTimeout = setTimeout(() => Reflect.deleteProperty(this, "p"), 0);
            const onChunksLoadedTimeout = setTimeout(() => Reflect.deleteProperty(this, "O"), 0);
        }
    });
}

// ── Fabrika proxy'leri ──────────────────────────────────────────────────────

const moduleFactoriesHandler: ProxyHandler<Record<PropertyKey, ModuleFactory>> = {
    get(target, p, receiver) {
        if (p === SYM_ORIGINAL_MODULE_FACTORIES) return target;
        return Reflect.get(target, p, receiver);
    },
    set: proxyFactoryAndUpdateExisting
};

const moduleFactoryHandler: ProxyHandler<ModuleFactory> = {
    apply(target, thisArg: unknown, argArray: Parameters<ModuleFactory>) {
        if ((target as any)[SYM_ORIGINAL_FACTORY] != null) {
            return runFactoryWithWrap(target as PatchedModuleFactory, thisArg, argArray);
        }
        const moduleId: string = (target as any).name;
        const patchedFactory = patchFactory(moduleId, target as ModuleFactory);
        return runFactoryWithWrap(patchedFactory, thisArg, argArray);
    },
    get(target, p, receiver) {
        if (p === SYM_IS_PROXIED_FACTORY) return true;
        const originalFactory: ModuleFactory = (target as any)[SYM_ORIGINAL_FACTORY] ?? target;
        if (p === "toString") return originalFactory.toString.bind(originalFactory);
        return Reflect.get(target, p, receiver);
    }
};

function proxyFactoryAndUpdateExisting(
    moduleFactories: Record<PropertyKey, ModuleFactory>,
    moduleId: PropertyKey,
    newFactory: ModuleFactory,
    receiver: any,
    ignoreExistingInTarget = false
): boolean {
    notifyFactoryListeners(moduleId, newFactory);

    const proxiedFactory = new Proxy(
        shouldEagerPatch(moduleId) ? patchFactory(moduleId, newFactory) : newFactory,
        moduleFactoryHandler
    );

    if (updateExistingFactory(moduleFactories, moduleId, newFactory, proxiedFactory, ignoreExistingInTarget)) {
        return true;
    }

    return Reflect.set(moduleFactories, moduleId, proxiedFactory, receiver);
}

function updateExistingFactory(
    moduleFactories: Record<PropertyKey, ModuleFactory>,
    moduleId: PropertyKey,
    newFactory: ModuleFactory,
    newProxiedFactory: ModuleFactory,
    ignoreExistingInTarget: boolean
): boolean {
    let existingFactory: ModuleFactory | undefined;

    for (const instance of allWebpackInstances) {
        const instanceModuleFactories = (instance.m as any)?.[SYM_ORIGINAL_MODULE_FACTORIES] ?? instance.m;
        if (ignoreExistingInTarget && instanceModuleFactories === moduleFactories) continue;
        if (instance.m != null && Object.hasOwn(instance.m, moduleId)) {
            existingFactory = instance.m[moduleId];
            break;
        }
    }

    if (existingFactory != null) {
        if ((existingFactory as any)[SYM_ORIGINAL_FACTORY] != null) {
            (existingFactory as any)[SYM_ORIGINAL_FACTORY] = newFactory;
        } else {
            defineInWebpackInstances(moduleId, newProxiedFactory);
        }
        return true;
    }

    return false;
}

function notifyFactoryListeners(moduleId: PropertyKey, factory: ModuleFactory): void {
    for (const listener of factoryListeners) {
        try {
            listener(factory, moduleId);
        } catch (err) {
            logger.error("Fabrika dinleyicisinde hata:\n", err);
        }
    }
}

/** `codePatcher`'a köprü. */
function patchFactory(moduleId: PropertyKey, originalFactory: ModuleFactory): PatchedModuleFactory {
    let patched: PatchedModuleFactory | null = null;
    try {
        patched = factoryPatcher(moduleId, originalFactory as ModuleFactory);
    } catch (err) {
        logger.error(`Modül ${String(moduleId)} patch'lenirken hata:\n`, err);
    }
    const result = (patched ?? originalFactory) as PatchedModuleFactory;
    (result as any)[SYM_ORIGINAL_FACTORY] = originalFactory;
    return result;
}

function runFactoryWithWrap(
    patchedFactory: PatchedModuleFactory,
    thisArg: unknown,
    argArray: Parameters<ModuleFactory>
): unknown {
    const originalFactory = (patchedFactory as any)[SYM_ORIGINAL_FACTORY] as ModuleFactory;

    if ((patchedFactory as any) === originalFactory) {
        delete (patchedFactory as any)[SYM_ORIGINAL_FACTORY];
    }

    const [module, , require] = argArray;

    // Bellek: fabrika çalıştı, proxy'ye artık gerek yok — orijinali geri koy.
    defineInWebpackInstances(module.id, originalFactory);

    // KRİTİK: `wreq` yakalanamadıysa, ilk çalışan fabrikanın `require`
    // argümanından türet. `/login` gibi durumlarda instance seçim
    // heuristikleri yetmediğinde kurtaran şey bu.
    if (wreq == null) {
        if (!wreqFallbackApplied) {
            wreqFallbackApplied = true;
            if (typeof require === "function" && (require as any).m != null && (require as any).c != null) {
                const { stack } = new Error();
                const instFile = stack?.match(/\/assets\/(.+?\.js)/)?.[1];
                logger.warn(`WebpackRequire başlatılmamıştı — ilk fabrikanın require'ına düşülüyor${interpolate(instFile)}`);
                _initWebpack(require as WebpackRequire);
            }
        }
    }

    let factoryReturn: unknown;
    try {
        factoryReturn = (patchedFactory as any).apply(thisArg, argArray);
    } catch (err) {
        if ((patchedFactory as any) === originalFactory) throw err;
        logger.error(`Patch'lenmiş modül fabrikasında hata (${String(module.id)}):\n`, err);
        return (originalFactory as any).apply(thisArg, argArray);
    }

    const exports = module.exports;

    if (typeof require === "function" && (require as any).c) {
        if (_blacklistBadModules((require as any).c, exports, module.id)) return factoryReturn;
    }

    if (exports == null) return factoryReturn;

    for (const listener of moduleListeners) {
        try {
            listener(exports, module);
        } catch (err) {
            logger.error("Modül dinleyicisinde hata:\n", err);
        }
    }

    return factoryReturn;
}

/** Kaynağında tüm verilen kodları içeren ilk modül fabrikası. */
export function findModuleFactory(...code: string[]): ModuleFactory | null {
    for (const instance of new Set<AnyWebpackRequire>([wreq, ...allWebpackInstances])) {
        const factories = (instance?.m as any)?.[SYM_ORIGINAL_MODULE_FACTORIES] ?? instance?.m;
        if (factories == null) continue;
        for (const moduleId in factories) {
            let source: string;
            try {
                source = String(factories[moduleId]);
            } catch {
                continue;
            }
            if (code.every(c => source.includes(c))) return factories[moduleId];
        }
    }
    return null;
}
