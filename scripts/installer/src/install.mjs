/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/**
 * Kurulum ve kaldırma (plan §12.1).
 *
 * **`original-fs` kullanılıyor, `fs` değil.** Electron `fs`'i asar dosyalarını
 * klasör gibi gösterecek şekilde patch'liyor; ham dosya sistemi gerekiyor
 * (plan §3.6, §12.2).
 */

import { createHash } from "node:crypto";

import { copyFileSync, existsSync, readFileSync, renameSync, rmSync, statSync } from "original-fs";

export function sha256(path) {
    return createHash("sha256").update(readFileSync(path)).digest("hex");
}

export function getStatus(install) {
    return {
        installed: existsSync(install.backupAsar),
        hasDevInjection: existsSync(install.devAppDir)
    };
}

/**
 * 1. `resources/app.asar` → `resources/_app.asar` yeniden adlandır
 * 2. Bizim `app.asar`'ı `resources/app.asar` olarak kopyala
 * 3. Boyut ve hash doğrula
 */
export function install(installTarget, sourceAsar) {
    const { backupAsar, appAsar } = installTarget;

    if (!existsSync(sourceAsar)) {
        throw new Error(`Kaynak paket bulunamadı: ${sourceAsar}`);
    }

    if (!existsSync(appAsar) && !existsSync(backupAsar)) {
        throw new Error(`Discord'un app.asar dosyası bulunamadı: ${appAsar}`);
    }

    // İdempotent: zaten kuruluysa yedeği tekrar oluşturma, sadece üzerine yaz.
    if (!existsSync(backupAsar)) {
        renameSync(appAsar, backupAsar);
    }

    copyFileSync(sourceAsar, appAsar);

    const expectedSize = statSync(sourceAsar).size;
    const actualSize = statSync(appAsar).size;

    if (expectedSize !== actualSize) {
        throw new Error(`Boyut doğrulaması başarısız: ${actualSize} ≠ ${expectedSize}`);
    }

    const expectedHash = sha256(sourceAsar);
    const actualHash = sha256(appAsar);

    if (expectedHash !== actualHash) {
        throw new Error(`SHA-256 doğrulaması başarısız:\n  beklenen ${expectedHash}\n  bulunan  ${actualHash}`);
    }

    return { size: actualSize, sha256: actualHash };
}

/** `_app.asar` varsa geri adlandır, bizimkini sil. */
export function uninstall(installTarget) {
    const { backupAsar, appAsar, devAppDir } = installTarget;

    // Geliştirme enjeksiyonu (`resources/app/`) varsa o da temizlenir.
    if (existsSync(devAppDir)) {
        rmSync(devAppDir, { recursive: true, force: true });
    }

    if (!existsSync(backupAsar)) {
        return { restored: false };
    }

    if (existsSync(appAsar)) {
        rmSync(appAsar, { force: true });
    }

    renameSync(backupAsar, appAsar);
    return { restored: true };
}
