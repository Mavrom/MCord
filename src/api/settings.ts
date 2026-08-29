/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Logger } from "../utils/logger";
import {
    type DefinedSettings,
    OptionType,
    type PluginSetting,
    type SettingsDefinition,
    type SettingsStore
} from "../utils/types";

const logger = new Logger("Settings", "#f4b8e4");

export interface McordSettings {
    /** Ana pencere / başlangıç ayarları — main process de bunu okuyor. */
    main: Record<string, unknown>;
    /** `pluginName → { enabled, ...ayarlar }` */
    plugins: Record<string, Record<string, unknown>>;
    /** Plugin çökme sayaçları (plan §8.5). */
    crashCount: Record<string, number>;
    /** Tüm pluginler kapalı başlar. */
    safeMode: boolean;
    /** Eager patch modu (plan §11.1). */
    eagerPatches: boolean;
    /**
     * Açılış tamamlanmadan kapandı mı — bir sonraki açılışta otomatik güvenli
     * mod tetikleyicisi (plan §8.5).
     */
    startupIncomplete: boolean;
}

const DEFAULT_SETTINGS: McordSettings = {
    main: {},
    plugins: {},
    crashCount: {},
    safeMode: false,
    eagerPatches: IS_DEV,
    startupIncomplete: false
};

function loadSettings(): McordSettings {
    try {
        const raw = window.McordNative?.settings.get() ?? {};
        return { ...DEFAULT_SETTINGS, ...raw } as McordSettings;
    } catch (err) {
        logger.error("Ayarlar okunamadı, varsayılanlara dönülüyor:\n", err);
        return { ...DEFAULT_SETTINGS };
    }
}

const raw = loadSettings();

const subscriptions = new Set<(path: string, value: unknown) => void>();

let writeTimer: ReturnType<typeof setTimeout> | undefined;

/** Yazma çağrıları toplanır — her tuş vuruşunda diske gitmiyoruz. */
function scheduleWrite(): void {
    if (writeTimer != null) clearTimeout(writeTimer);

    writeTimer = setTimeout(() => {
        writeTimer = undefined;
        window.McordNative?.settings.set(raw).catch((err: unknown) =>
            logger.error("Ayarlar yazılamadı:\n", err));
    }, 200);
}

/** Değişiklikleri yakalayıp diske yazan derin proxy. */
function makeProxy<T extends object>(target: T, path = ""): T {
    return new Proxy(target, {
        get(obj, prop, receiver) {
            const value = Reflect.get(obj, prop, receiver);
            if (typeof prop === "symbol") return value;

            // Eksik alt nesneleri erişimde oluştur — plugin ilk kez ayar yazarken
            // `settings.plugins.MyPlugin` var olmayabilir.
            if (value === undefined && (path === "plugins" || path === "crashCount")) {
                const created = {};
                Reflect.set(obj, prop, created, receiver);
                return makeProxy(created, `${path}.${prop}`);
            }

            if (value != null && typeof value === "object") {
                return makeProxy(value as object, path ? `${path}.${prop}` : prop);
            }

            return value;
        },

        set(obj, prop, newValue, receiver) {
            if (typeof prop !== "symbol" && Reflect.get(obj, prop, receiver) === newValue) return true;

            const ok = Reflect.set(obj, prop, newValue, receiver);
            if (!ok) return false;

            const fullPath = path ? `${path}.${String(prop)}` : String(prop);
            for (const subscriber of subscriptions) {
                try {
                    subscriber(fullPath, newValue);
                } catch (err) {
                    logger.error("Ayar dinleyicisinde hata:\n", err);
                }
            }

            scheduleWrite();
            return true;
        },

        deleteProperty(obj, prop) {
            const ok = Reflect.deleteProperty(obj, prop);
            if (ok) scheduleWrite();
            return ok;
        }
    });
}

/** Global ayar nesnesi. Yazmak diske kaydeder. */
export const Settings = makeProxy(raw);

/** Ham nesne — serileştirme ve yedekleme için. */
export function getRawSettings(): McordSettings {
    return raw;
}

export function subscribeToSettings(callback: (path: string, value: unknown) => void): () => void {
    subscriptions.add(callback);
    return () => subscriptions.delete(callback);
}

/** Diske hemen yaz — kapanmadan önce çağrılıyor. */
export function flushSettings(): void {
    if (writeTimer != null) clearTimeout(writeTimer);
    writeTimer = undefined;
    window.McordNative?.settings.set(raw).catch(() => { });
}

// ── definePluginSettings (plan §7.1) ─────────────────────────────────────────

function defaultValueOf(setting: PluginSetting): unknown {
    if (setting.type === OptionType.SELECT) {
        return setting.options.find(option => option.default)?.value;
    }
    return (setting as { default?: unknown }).default;
}

/**
 * Tip güvenli ayar tanımı. Ayar UI'ı bu tanımdan **otomatik üretiliyor** —
 * plugin başına ayar ekranı yazmıyorsun (plan §7.1).
 */
export function definePluginSettings<D extends SettingsDefinition>(definition: D): DefinedSettings<D> {
    const result: DefinedSettings<D> = {
        def: definition,
        pluginName: "",

        get store(): SettingsStore<D> {
            const { pluginName } = result;

            if (!pluginName) {
                throw new Error("definePluginSettings: pluginName henüz atanmadı (PluginManager doldurur).");
            }

            return new Proxy({} as SettingsStore<D>, {
                get(_target, prop) {
                    if (typeof prop !== "string") return undefined;

                    const setting = definition[prop];
                    if (!setting) return undefined;

                    const stored = Settings.plugins[pluginName]?.[prop];
                    return stored !== undefined ? stored : defaultValueOf(setting);
                },

                set(_target, prop, newValue) {
                    if (typeof prop !== "string") return false;

                    const setting = definition[prop];
                    if (!setting) return false;

                    if (setting.isValid) {
                        const valid = (setting.isValid as (value: unknown) => boolean | string)(newValue);
                        if (valid !== true) {
                            logger.warn(
                                `${pluginName}.${prop}: geçersiz değer` +
                                (typeof valid === "string" ? ` — ${valid}` : "")
                            );
                            return false;
                        }
                    }

                    Settings.plugins[pluginName] ??= {};
                    Settings.plugins[pluginName][prop] = newValue;

                    try {
                        (setting.onChange as ((value: unknown) => void) | undefined)?.(newValue);
                    } catch (err) {
                        logger.error(`${pluginName}.${prop} onChange hata verdi:\n`, err);
                    }

                    return true;
                },

                has: (_target, prop) => typeof prop === "string" && prop in definition,
                ownKeys: () => Object.keys(definition),
                getOwnPropertyDescriptor: (_target, prop) =>
                    typeof prop === "string" && prop in definition
                        ? { enumerable: true, configurable: true, value: (result.store as any)[prop] }
                        : undefined
            });
        },

        withPrivateSettings<T extends object>() {
            return result.store as SettingsStore<D> & T;
        }
    };

    return result;
}

/** Bir ayarın `hidden`/`disabled` değeri — fonksiyon da olabiliyor (plan §7.1). */
export function resolveSettingFlag(flag: boolean | (() => boolean) | undefined): boolean {
    if (typeof flag === "function") {
        try {
            return flag();
        } catch {
            return false;
        }
    }
    return flag === true;
}
