/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Logger } from "../utils/logger";

const logger = new Logger("Api:DataStore", "#f4b8e4");

/**
 * Plugin verisi için IndexedDB deposu (plan §7.2).
 *
 * Ayarlar `settings.json`'da düz JSON olarak durur — insan okunabilir ve
 * yedeklenebilir. Büyük veri (mesaj arşivi, önbellek) buraya gider.
 *
 * Bulut senkronizasyonu yok (plan §0.2).
 */

const DB_NAME = "MCordData";
const DB_VERSION = 1;
const STORE_NAME = "kv";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
    dbPromise ??= new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            if (!request.result.objectStoreNames.contains(STORE_NAME)) {
                request.result.createObjectStore(STORE_NAME);
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

    return dbPromise;
}

function transact<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    return openDatabase().then(db => new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode);
        const request = run(transaction.objectStore(STORE_NAME));

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    }));
}

/** Plugin adıyla ön ekli anahtar — pluginler birbirinin verisini ezmesin. */
function scopedKey(pluginName: string, key: string): string {
    return `${pluginName}::${key}`;
}

export async function get<T>(pluginName: string, key: string): Promise<T | undefined> {
    try {
        return await transact<T>("readonly", store => store.get(scopedKey(pluginName, key)));
    } catch (err) {
        logger.error(`${pluginName}: "${key}" okunamadı:\n`, err);
        return undefined;
    }
}

export async function set(pluginName: string, key: string, value: unknown): Promise<boolean> {
    try {
        await transact("readwrite", store => store.put(value, scopedKey(pluginName, key)));
        return true;
    } catch (err) {
        logger.error(`${pluginName}: "${key}" yazılamadı:\n`, err);
        return false;
    }
}

export async function del(pluginName: string, key: string): Promise<boolean> {
    try {
        await transact("readwrite", store => store.delete(scopedKey(pluginName, key)));
        return true;
    } catch (err) {
        logger.error(`${pluginName}: "${key}" silinemedi:\n`, err);
        return false;
    }
}

/** Bir plugin'in tüm verisi — plugin kaldırılırken temizlik için. */
export async function clearPlugin(pluginName: string): Promise<number> {
    try {
        const keys = await transact<IDBValidKey[]>("readonly", store => store.getAllKeys());
        const prefix = `${pluginName}::`;
        const owned = keys.filter(key => typeof key === "string" && key.startsWith(prefix));

        for (const key of owned) {
            await transact("readwrite", store => store.delete(key));
        }

        return owned.length;
    } catch (err) {
        logger.error(`${pluginName}: veri temizlenemedi:\n`, err);
        return 0;
    }
}

/** Plugin'e bağlı, ön eki otomatik uygulanan görünüm. */
export function createStore(pluginName: string) {
    return {
        get: <T>(key: string) => get<T>(pluginName, key),
        set: (key: string, value: unknown) => set(pluginName, key, value),
        delete: (key: string) => del(pluginName, key),
        clear: () => clearPlugin(pluginName)
    };
}
