/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { byCode, byKeys, byStoreName } from "./filters";
import { find, findAll, findStore } from "./finder";
import { wreq } from "./intercept";
import type { ModuleExports } from "./types";

/** Discord'un Flux modülü — `Store.getAll()` buradan geliyor. */
let fluxModule: ModuleExports | null = null;

function getFlux(): ModuleExports | null {
    // Vencord: `Flux = findByPropsLazy("connectStores")` — YALNIZ `connectStores`.
    // Bizde `["Store","connectStores"]` aranıyordu ve bu FARKLI bir modülü
    // (farklı `Store.getAll()` kaydını) bulabiliyordu.
    fluxModule ??= find(byKeys(["connectStores"]), { silent: true })
        ?? find(byKeys(["Store", "Dispatcher"]), { silent: true });
    return fluxModule;
}

/**
 * Discord'un tüm Flux store singleton'ları.
 *
 * Kanıtlanmış açık-kaynak istemcinin `populateFluxStoreMap` yaklaşımı: her
 * store `class X extends Flux.Store` çalıştırıldığında temel sınıfın statik
 * kaydına giriyor. `/login` sayfasında bile (tüm modüller zorla require
 * edildiğinde) `Flux.Store.getAll()` bunları döndürüyor.
 */
export function allStores(): ModuleExports[] {
    const out: ModuleExports[] = [];
    const seen = new Set<unknown>();

    const collect = (registry: unknown) => {
        if (!Array.isArray(registry)) return;
        for (const store of registry) {
            if (store == null || seen.has(store)) continue;
            seen.add(store);
            out.push(store);
        }
    };

    // 1) Bilinen Flux modülü
    try {
        collect(getFlux()?.Store?.getAll?.());
    } catch { /* */ }

    // 2) `Store.getAll` sunan **tüm** modüller. Discord'da birden fazla
    //    Flux-benzeri modül var ve store'lar farklı kayıtlara dağılabiliyor;
    //    yalnız ilkini almak store finder'larının kırık görünmesine yol açıyordu.
    try {
        for (const mod of findAll((m: any) => typeof m?.Store?.getAll === "function")) {
            try {
                collect((mod as any).Store.getAll());
            } catch { /* */ }
        }
    } catch { /* */ }

    return out;
}

/**
 * `libdiscore` WASM modülünün `*Store` export'ları.
 *
 * Discord birçok store'u (ChannelStore, MessageStore, ExperimentStore vb.)
 * `Flux.Store` kaydından çıkarıp libdiscore'a taşıdı — bunlar `Flux.Store.getAll()`
 * içinde YOK. Vencord'un `populateFluxStoreMap`'i bunları `findByCode(
 * "libdiscoreWasm is not initialized")` ile çekiyor. Bu adım olmadan store
 * finder'larının çoğu kırık görünüyor.
 */
function libdiscoreStores(): Record<string, ModuleExports> {
    try {
        const getLibdiscore = find(byCode("libdiscoreWasm is not initialized"), { silent: true }) as
            | (() => Record<string, ModuleExports>)
            | null;
        const exports = getLibdiscore?.();
        if (exports == null) return {};

        const out: Record<string, ModuleExports> = {};
        for (const key in exports) {
            if (key.endsWith("Store")) out[key] = exports[key];
        }
        return out;
    } catch {
        return {};
    }
}

const storeCache = new Map<string, ModuleExports>();

/** Aynı store için tekrar tekrar yeniden yükleme denemeyelim. */
const revivalTried = new Set<string>();

let storeModulesRecovered = false;

/**
 * Store sınıfı tanımlayan **tüm** modülleri tek seferde, sabit sırayla toparlar.
 *
 * Dairesel bağımlılık yüzünden yarım kalan store modüllerinde `new X()` hiç
 * çalışmıyor ve store Flux kaydına girmiyor. Talep anında tek tek yeniden
 * yüklemek (lazy revive) sonucu **koşudan koşuya değiştiriyordu**; bu yüzden
 * tek, deterministik geçiş yapıyoruz: kaynağında `displayName="…Store"` geçen
 * her modül için, o ad kayıtta yoksa modülü silip yeniden çalıştır.
 */
export function recoverStoreModules(): void {
    if (storeModulesRecovered) return;
    storeModulesRecovered = true;

    const factories = (wreq as any)?.m;
    const cacheObj = (wreq as any)?.c;
    if (factories == null || cacheObj == null) return;

    const known = new Set<string>();
    for (const store of allStores()) {
        try {
            const n = store.constructor?.displayName ?? store.getName?.();
            if (typeof n === "string") known.add(n);
        } catch { /* */ }
    }

    const pattern = /displayName\s*[=:]\s*"([A-Za-z0-9_$]+Store)"/g;

    for (const id of Object.keys(factories).sort()) {
        let src: string;
        try {
            src = String(factories[id]);
        } catch {
            continue;
        }
        if (!src.includes("Store\"")) continue;

        pattern.lastIndex = 0;
        let missing = false;
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(src)) !== null) {
            if (!known.has(match[1])) {
                missing = true;
                break;
            }
        }
        if (!missing) continue;

        try {
            delete cacheObj[id];
        } catch { continue; }
        try {
            (wreq as any)(id);
        } catch { /* yeniden de patladı */ }
    }

    storeCache.clear();
}

/**
 * Store'un modülünü ham fabrika kaynağından bulup zorla yeniden çalıştırır.
 *
 * Discord'un store modülleri dairesel bağımlılık yüzünden yarım kalabiliyor:
 * webpack export getter'larını tanımlıyor ama getter'ın kapattığı `let`
 * atanmadan kalıyor. Cache kaydını silip fabrikayı yeniden çalıştırmak
 * store'un `new X()` satırını tekrar koşturuyor ve Flux kaydına giriyor.
 */
function reviveStoreModule(name: string): ModuleExports | undefined {
    if (revivalTried.has(name)) return undefined;
    revivalTried.add(name);

    const factories = (wreq as any)?.m;
    const cacheObj = (wreq as any)?.c;
    if (factories == null || cacheObj == null) return undefined;

    // Store SINIFININ imzaları. `new Logger("XStore")` gibi yanlış eşleşmeleri
    // elemek için sınıf-tanımı desenleri aranıyor.
    const needles = [
        `displayName="${name}"`,      // class X extends Store { static displayName="Y" }
        `displayName:"${name}"`,
        `getName(){return"${name}"`
    ];

    const candidates: string[] = [];
    for (const id in factories) {
        let src: string;
        try {
            src = String(factories[id]);
        } catch {
            continue;
        }
        if (needles.some(n => src.includes(n))) candidates.push(id);
    }

    // Her adayı dene — ilkinde durma (ilk eşleşen çoğu zaman yanlış modül).
    for (const id of candidates) {
        try {
            delete cacheObj[id];
        } catch { /* silinemedi */ }
        try {
            (wreq as any)(id);
        } catch { /* yeniden de patladı */ }

        for (const store of allStores()) {
            try {
                if (store.constructor?.displayName === name || store.getName?.() === name) {
                    return store;
                }
            } catch { /* */ }
        }

        // Kayıt tazelenmemiş olabilir ama modül export'u artık sağlam olabilir.
        const viaSearch = findStore(name);
        if (viaSearch != null) return viaSearch;
    }

    return undefined;
}

/**
 * Flux store'lara ada göre dinamik erişim (plan §4.6).
 *
 *   Stores.UserStore.getCurrentUser()
 *
 * `ownKeys` tüm store adlarını, `get` tembel çekip cache'ler, `set` hata
 * fırlatır — store'lar salt okunur (plan §13).
 */
export const Stores: Record<string, ModuleExports> = new Proxy({}, {
    ownKeys() {
        const names = new Set<string>();
        for (const store of allStores()) {
            try {
                const name = store.getName();
                if (typeof name === "string") names.add(name);
            } catch { /* bozuk store'u atla */ }
        }
        return [...names];
    },

    getOwnPropertyDescriptor(_target, prop) {
        if (typeof prop !== "string") return undefined;
        return { enumerable: true, configurable: true, value: resolveStore(prop) };
    },

    has(_target, prop) {
        return typeof prop === "string" && resolveStore(prop) != null;
    },

    get(_target, prop) {
        if (typeof prop !== "string") return undefined;
        return resolveStore(prop);
    },

    set() {
        throw new Error("Flux store'ları salt okunurdur.");
    },

    deleteProperty() {
        throw new Error("Flux store'ları silinemez.");
    }
});

export function resolveStore(name: string): ModuleExports | undefined {
    const cached = storeCache.get(name);
    if (cached !== undefined) return cached;

    // 1) Flux statik kaydı (`class X extends Flux.Store`).
    //    İki geçiş: önce KESİN ölçüt (`constructor.displayName` — Vencord'un
    //    tek ölçütü), sonra gevşek `getName()`. Tek geçişte gevşek ölçüt
    //    yanlış store'u kapabiliyordu.
    const stores = allStores();

    for (const store of stores) {
        try {
            if (store.constructor?.displayName === name || store.displayName === name) {
                storeCache.set(name, store);
                return store;
            }
        } catch { /* bozuk store'u atla */ }
    }

    for (const store of stores) {
        try {
            if (store.getName?.() === name) {
                storeCache.set(name, store);
                return store;
            }
        } catch { /* bozuk store'u atla */ }
    }

    // 2) libdiscore WASM store'ları (Discord birçoğunu buraya taşıdı).
    const fromLibdiscore = libdiscoreStores()[name];
    if (fromLibdiscore != null) {
        storeCache.set(name, fromLibdiscore);
        return fromLibdiscore;
    }

    // 3) Webpack araması (`constructor.displayName` / `getName()`).
    const viaWebpack = findStore(name);
    if (viaWebpack != null) {
        storeCache.set(name, viaWebpack);
        return viaWebpack;
    }

    // 4) SON ÇARE: store'un modülünü ham kaynağından bul ve **zorla yeniden
    //    çalıştır**. Dairesel bağımlılık yüzünden modül yarım kalmış olabiliyor
    //    (export getter'ları "Cannot access X before initialization" fırlatır);
    //    cache kaydını silip yeniden yükleyince store kendini Flux'a kaydediyor.
    // Deterministik toparlama (recoverStoreModules) reporter/başlangıçta bir
    // kez çalışıyor. Talep anında tek tek yeniden yükleme sonucu koşudan
    // koşuya değiştiriyordu; son çare olarak yalnız o ada özel deneniyor.
    const revived = reviveStoreModule(name);
    if (revived != null) {
        storeCache.set(name, revived);
        return revived;
    }

    return undefined;
}

/** Store yüklenene kadar bekleyen sürüm — `lazy.ts`'deki `getLazy` üzerinden. */
export function getStoreLazy(name: string): ModuleExports {
    return new Proxy({}, {
        get(_target, prop, receiver) {
            const store = resolveStore(name);
            if (store == null) return undefined;
            return Reflect.get(store, prop, receiver);
        },
        has(_target, prop) {
            const store = resolveStore(name);
            return store != null && Reflect.has(store, prop);
        }
    });
}

/** Store cache'ini temizler — Discord yeniden bağlandığında gerekebiliyor. */
export function clearStoreCache(): void {
    storeCache.clear();
    fluxModule = null;
}

export { byStoreName };
