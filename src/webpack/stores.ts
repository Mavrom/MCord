/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { byKeys, byStoreName } from "./filters";
import { find, findStore } from "./finder";
import type { ModuleExports } from "./types";

/** Discord'un Flux modülü — `Store.getAll()` buradan geliyor. */
let fluxModule: ModuleExports | null = null;

function getFlux(): ModuleExports | null {
    fluxModule ??= find(byKeys(["Store", "connectStores"]), { silent: true })
        ?? find(byKeys(["Store", "Dispatcher"]), { silent: true });
    return fluxModule;
}

function allStores(): ModuleExports[] {
    const flux = getFlux();
    try {
        return flux?.Store?.getAll?.() ?? [];
    } catch {
        return [];
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

function resolveStore(name: string): ModuleExports | undefined {
    const cached = storeCache.get(name);
    if (cached !== undefined) return cached;

    for (const store of allStores()) {
        try {
            if (store.getName() === name) {
                storeCache.set(name, store);
                return store;
            }
        } catch { /* bozuk store'u atla */ }
    }

    // Flux henüz hazır değilse webpack araması ile dene.
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
