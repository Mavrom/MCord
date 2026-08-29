/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { basename, dirname, join } from "node:path";

import { app } from "electron";
import { copyFileSync, existsSync, readdirSync, renameSync } from "original-fs";

/**
 * Discord host güncellemesinden sağ çıkma (plan §3.6).
 *
 * Windows'ta Discord kendini `app-1.0.9186` → `app-1.0.9187` gibi yeni bir
 * klasöre kuruyor. Enjeksiyon eski klasörde kaldığı için mod sessizce ölüyor.
 * Discord'un güncelleyicisi yeniden başlatırken `app.quit()` çağırdığı için,
 * biz kapanırken kendimizi yeni sürüme kopyalıyoruz.
 */
export function initPersistAfterUpdate(): void {
    app.on("before-quit", () => {
        try {
            patchLatest();
        } catch (err) {
            console.error("[MCord] Yeni Discord sürümüne enjeksiyon kopyalanamadı:", err);
        }
    });
}

export interface InjectionState {
    /** Şu an çalıştığımız `app-*` klasörü. */
    currentVersion: string;
    /** Diskteki en yeni `app-*` klasörü. */
    latestVersion: string;
    /** Eski sürümde kalmışız ve yeni sürüme henüz enjekte olmamışız. */
    isOutdated: boolean;
    /** Yeni sürüme kopyalama şu an mümkün mü. */
    canRepatch: boolean;
}

/**
 * `before-quit` tek tetikleyici olarak yetersiz — Discord çökerek kapanırsa
 * çalışmıyor. Bu yüzden açılışta da durum kontrol edilir ve kullanıcıya
 * repatch teklif edilir (plan §3.6, "ekleyeceğimiz iyileştirme").
 */
export function getInjectionState(): InjectionState {
    const currentAppPath = dirname(process.execPath);
    const currentVersion = basename(currentAppPath);
    const discordPath = join(currentAppPath, "..");

    const latestVersion = findLatestVersion(discordPath, currentVersion);
    const paths = resolvePaths(discordPath, currentVersion, latestVersion);

    return {
        currentVersion,
        latestVersion,
        isOutdated: latestVersion !== currentVersion,
        canRepatch: latestVersion !== currentVersion
            && existsSync(paths.oldOurAsar)
            && existsSync(paths.newAppAsar)
            && !existsSync(paths.newBackup)
    };
}

/** Enjeksiyonu en yeni `app-*` klasörüne kopyalar. İdempotent. */
export function patchLatest(): boolean {
    // Kaçış kapısı: otomatik repatch'i devre dışı bırakmak için.
    if (process.env.DISABLE_UPDATER_AUTO_PATCHING) return false;

    const currentAppPath = dirname(process.execPath);
    const currentVersion = basename(currentAppPath);
    const discordPath = join(currentAppPath, "..");

    const latestVersion = findLatestVersion(discordPath, currentVersion);
    if (latestVersion === currentVersion) return false;

    const { oldOurAsar, newAppAsar, newBackup } = resolvePaths(discordPath, currentVersion, latestVersion);

    // `existsSync(newBackup)` idempotency sağlıyor: zaten patch'lenmişse tekrar yapma.
    if (!existsSync(oldOurAsar) || !existsSync(newAppAsar) || existsSync(newBackup)) return false;

    console.info(`[MCord] Host güncellemesi tespit edildi (${currentVersion} -> ${latestVersion}). Yeniden enjekte ediliyor…`);

    renameSync(newAppAsar, newBackup);
    copyFileSync(oldOurAsar, newAppAsar);

    return true;
}

function resolvePaths(discordPath: string, currentVersion: string, latestVersion: string) {
    return {
        oldOurAsar: join(discordPath, currentVersion, "resources", "app.asar"),
        newAppAsar: join(discordPath, latestVersion, "resources", "app.asar"),
        newBackup: join(discordPath, latestVersion, "resources", "_app.asar")
    };
}

function findLatestVersion(discordPath: string, currentVersion: string): string {
    let entries: string[];
    try {
        entries = readdirSync(discordPath) as unknown as string[];
    } catch {
        return currentVersion;
    }

    return entries.reduce(
        (prev, curr) => (curr.startsWith("app-") && isNewer(curr, prev)) ? curr : prev,
        currentVersion
    );
}

/**
 * Sürüm karşılaştırması string değil, sayısal parça parça.
 * `app-1.0.10` string olarak `app-1.0.9`'dan küçük görünür.
 */
function isNewer(candidate: string, current: string): boolean {
    const newParts = parseVersion(candidate);
    const oldParts = parseVersion(current);

    // Karşılaştırma mevcut sürümün parça sayısı kadar dönüyor.
    for (let i = 0; i < oldParts.length; i++) {
        if (newParts[i] > oldParts[i]) return true;
        if (newParts[i] < oldParts[i]) return false;
    }

    return false;
}

function parseVersion(dirName: string): number[] {
    return dirName
        .slice("app-".length)
        .split(".")
        .map(part => {
            const n = Number.parseInt(part, 10);
            return Number.isNaN(n) ? 0 : n;
        });
}
