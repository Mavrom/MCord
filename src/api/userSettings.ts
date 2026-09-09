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
    userSettingsAPIGroup: string;
    /** Enjeksiyon plugin'i tarafından eklenir; ham Discord nesnesinde yoktur. */
    userSettingsAPIName: string;
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

    // `getOwnPropertyNames` + export başına try/catch: Discord'un
    // `_blacklistBadModules`'ü bazı export'ları sayılamaz (non-enumerable)
    // yapıyor (`for...in` görmüyor) ve zehirlenmiş modül önbelleğindeki
    // getter'lar "Cannot access 'X' before initialization" fırlatıyor. Tek bir
    // bozuk export yüzünden tüm arama patlamamalı.
    let keys: string[];
    try {
        keys = Object.getOwnPropertyNames(module);
    } catch {
        return undefined;
    }

    for (const key of keys) {
        let setting: any;
        try {
            setting = module[key];
        } catch {
            continue;
        }

        if (setting?.userSettingsAPIGroup === group && setting?.userSettingsAPIName === name) {
            return setting as UserSettingDefinition<T>;
        }
    }

    return undefined;
}

/** {@link getUserSetting}, tembel — ilk erişimde çözülür (`findLazy` ile aynı desen). */
export function getUserSettingLazy<T = any>(group: string, name: string): UserSettingDefinition<T> {
    let resolved: UserSettingDefinition<T> | undefined;

    // Başarılı sonuç önbelleğe alınır, BAŞARISIZ sonuç alınmaz: ayar modülü
    // erişim anında henüz yüklenmemiş olabiliyor ve eski "bir kez dene"
    // mantığı o durumda kalıcı olarak `undefined` döndürüyordu.
    const resolve = () => (resolved ??= getUserSetting<T>(group, name));

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
