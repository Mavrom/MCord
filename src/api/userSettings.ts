/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { bySource } from "../webpack/filters";
import { findLazy } from "../webpack/lazy";

/**
 * Discord'un kendi ayarlarından biri (bizim plugin ayarlarımız değil).
 *
 * Ayar nesneleri `_api/userSettings` plugin'inin uyguladığı kod patch'i
 * sayesinde `group`/`name` etiketiyle işaretli geliyor — Discord'un kendisi
 * bu bilgiyi export etmiyor, biz ekliyoruz (plan §6.5).
 */
export interface UserSettingDefinition<T> {
    getSetting(): T;
    updateSetting(value: T | ((old: T) => T)): Promise<void>;
    useSetting(): T;
    /** Enjeksiyon plugin'i tarafından eklenir; ham Discord nesnesinde yoktur. */
    mcordGroup: string;
    /** Enjeksiyon plugin'i tarafından eklenir; ham Discord nesnesinde yoktur. */
    mcordName: string;
}

/**
 * Discord'un tüm ayarlarını tek nesnede tutan modül.
 *
 * Modülün export'ları değil, **kaynağı** aranıyor: ayar tanımları
 * `"textAndImages","renderSpoilers"` gibi sabit grup/isim çiftleriyle
 * kuruluyor, bu string'ler sadece modülün ham kodunda görünüyor.
 */
const UserSettingsModule = findLazy(bySource('"textAndImages","renderSpoilers"'));

/**
 * Verilen grup ve isimdeki Discord ayarını bulur.
 *
 * `_api/userSettings` etkin değilse ayar nesneleri etiketlenmemiş olur ve
 * bu fonksiyon hep `undefined` döner — plugin'ler `dependencies:
 * ["UserSettingsAPI"]` ile bağımlılığı bildirmeli (plan §6.3), o zaman
 * `PluginManager` otomatik etkinleştirir.
 */
export function getUserSetting<T = any>(group: string, name: string): UserSettingDefinition<T> | undefined {
    const module = UserSettingsModule;
    if (module == null) return undefined;

    for (const key in module) {
        const setting = module[key];
        if (setting?.mcordGroup === group && setting?.mcordName === name) {
            return setting as UserSettingDefinition<T>;
        }
    }

    return undefined;
}

/** {@link getUserSetting}, tembel — ilk erişimde çözülür (`findLazy` ile aynı desen). */
export function getUserSettingLazy<T = any>(group: string, name: string): UserSettingDefinition<T> {
    let resolved: UserSettingDefinition<T> | undefined;
    let attempted = false;

    const resolve = () => {
        if (!attempted) {
            attempted = true;
            resolved = getUserSetting<T>(group, name);
        }
        return resolved;
    };

    return new Proxy({} as UserSettingDefinition<T>, {
        get(_target, prop, receiver) {
            const value = resolve();
            return value == null ? undefined : Reflect.get(value, prop, receiver);
        },
        has(_target, prop) {
            const value = resolve();
            return value != null && Reflect.has(value, prop);
        }
    });
}
