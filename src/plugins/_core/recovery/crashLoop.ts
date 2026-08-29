/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Settings } from "../../../api/settings";
import { Logger } from "../../../utils/logger";

const logger = new Logger("Recovery:CrashLoop", "#e78284");

/** Bu kadar art arda çökmeden sonra plugin kalıcı olarak kapatılır (plan §8.5). */
export const CRASH_LIMIT = 3;

/** Bu süre boyunca sorunsuz geçen oturum sayaçları sıfırlar. */
export const CLEAN_SESSION_MS = 5 * 60 * 1000;

/**
 * Çökme döngüsü kırıcı (plan §8.5) — BD'de olmayan güvence.
 *
 * Aynı plugin art arda 3 kez çöktürürse kalıcı olarak devre dışı bırakılır ve
 * bir sonraki açılışta uyarı gösterilir.
 */
export function recordCrash(pluginName: string): number {
    const count = (Settings.crashCount[pluginName] ?? 0) + 1;
    Settings.crashCount[pluginName] = count;

    logger.warn(`${pluginName}: ${count}. çökme (limit ${CRASH_LIMIT}).`);
    return count;
}

export function shouldPermanentlyDisable(pluginName: string): boolean {
    return (Settings.crashCount[pluginName] ?? 0) >= CRASH_LIMIT;
}

export function getCrashCount(pluginName: string): number {
    return Settings.crashCount[pluginName] ?? 0;
}

/** Kalıcı kapatma uyarısı gösterilmesi gereken pluginler. */
export function getPermanentlyDisabledPlugins(): string[] {
    return Object.keys(Settings.crashCount).filter(shouldPermanentlyDisable);
}

let cleanSessionTimer: ReturnType<typeof setTimeout> | undefined;

/** 5 dakika sorunsuz geçerse sayaçları sıfırla. */
export function startCleanSessionTimer(): void {
    stopCleanSessionTimer();

    cleanSessionTimer = setTimeout(() => {
        const had = Object.keys(Settings.crashCount).length > 0;
        for (const name of Object.keys(Settings.crashCount)) {
            delete Settings.crashCount[name];
        }
        if (had) logger.info("Sorunsuz oturum — çökme sayaçları sıfırlandı.");
    }, CLEAN_SESSION_MS);
}

export function stopCleanSessionTimer(): void {
    if (cleanSessionTimer != null) clearTimeout(cleanSessionTimer);
    cleanSessionTimer = undefined;
}

/**
 * Başlangıçta (WebpackReady'den önce) çöküyorsa otomatik güvenli mod (plan §8.5).
 */
export function enterSafeMode(reason: string): void {
    Settings.safeMode = true;
    logger.error(`Güvenli mod etkinleştirildi: ${reason}`);
}

export function exitSafeMode(): void {
    Settings.safeMode = false;
}
