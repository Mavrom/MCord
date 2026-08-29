/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/**
 * Bir global/nesne özelliği henüz tanımlı değilken setter kurar; özellik ilk kez
 * atandığı anda `callback` çalışır ve setter kaldırılıp normal davranışa dönülür.
 *
 * `appSettings` gibi Discord'un sonradan tanımladığı globallere erişmek için
 * kullanılır (plan §3.5).
 */
export function onceDefined<T extends object, P extends keyof T>(
    target: T,
    property: P,
    callback: (value: T[P]) => void
): void {
    const backup = Object.getOwnPropertyDescriptor(target, property);

    if (backup && !backup.configurable) {
        throw new Error(`onceDefined: ${String(property)} is not configurable`);
    }

    // Zaten tanımlıysa doğrudan çağır.
    if (property in target) {
        callback(target[property]);
        return;
    }

    Object.defineProperty(target, property, {
        configurable: true,
        enumerable: false,
        get: () => undefined,
        set(value: T[P]) {
            // Önce kendi tuzağımızı kaldır, sonra gerçek atamayı yap.
            // Sıralama önemli: callback içinden okuma yapılabiliyor olmalı.
            if (backup) Object.defineProperty(target, property, backup);
            else delete target[property];

            target[property] = value;
            callback(value);
        }
    });
}
