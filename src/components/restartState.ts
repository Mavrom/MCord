/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/**
 * "Yeniden başlatma gerekiyor" durumu — global, tek yönlü (bir kez `true`,
 * uygulama yeniden başlayana kadar öyle kalır).
 *
 * Ayar penceresinin farklı köşelerindeki bileşenler (plugin kartları onu
 * tetikliyor, sol üstteki başlık onu gösteriyor) aynı durumu paylaşsın diye
 * modül düzeyinde tutuluyor — prop zinciri veya context'e gerek yok.
 */

import { flushSettings } from "../api/settings";
import { React } from "../webpack/react";

let restartNeeded = false;
const listeners = new Set<() => void>();

/** Kod patch'i olan bir plugin açılıp kapatıldığında çağrılır (plan §7.3). */
export function markRestartNeeded(): void {
    if (restartNeeded) return;
    restartNeeded = true;
    for (const listener of listeners) listener();
}

export function isRestartNeeded(): boolean {
    return restartNeeded;
}

/** Ayarları diske yazar ve Discord'u yeniden başlatır. */
export function relaunchDiscord(): void {
    flushSettings();
    void window.McordNative.app.relaunch();
}

/** Durum değiştiğinde yeniden render eden hook. */
export function useRestartNeeded(): boolean {
    const [, forceRender] = React.useReducer((n: number) => n + 1, 0);

    React.useEffect(() => {
        const listener = () => forceRender();
        listeners.add(listener);
        return () => void listeners.delete(listener);
    }, []);

    return restartNeeded;
}
