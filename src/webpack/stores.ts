/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { byCode, byKeys, byStoreName } from "./filters";
import { find, findAll, findStore } from "./finder";
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
    for (const store of allStores()) {
        try {
            if (store.getName?.() === name || store.constructor?.displayName === name) {
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
