/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/**
 * Kurulum ve kaldırma.
 *
 * **`node:fs` kullanılıyor.** `original-fs` yalnızca Electron içinde vardır;
 * standalone Node süreçte `fs` yamalanmamıştır, `app.asar` normal dosya gibi
 * görünür — `original-fs` hem yanlış hem gereksiz.
 */

import { createHash } from "node:crypto";
import { copyFileSync, existsSync, readFileSync, renameSync, rmSync, statSync } from "node:fs";

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
 * 1. `app.asar` → `_app.asar` (yedek yoksa)
 * 2. Bizim `app.asar`'ı kopyala
 * 3. Boyut + SHA-256 doğrula
 * Doğrulama başarısızsa `throw` (çağıran `Result`'a çevirir).
 */
export function installAsar(install, sourceAsar) {
    const { backupAsar, appAsar } = install;

    if (!existsSync(sourceAsar)) {
        const e = new Error(`Kaynak paket bulunamadı: ${sourceAsar}`);
        e.code = "SOURCE_NOT_FOUND";
        throw e;
    }
    if (!existsSync(appAsar) && !existsSync(backupAsar)) {
        const e = new Error(`Discord'un app.asar dosyası bulunamadı: ${appAsar}`);
        e.code = "ASAR_NOT_FOUND";
        throw e;
    }

    if (!existsSync(backupAsar)) {
        renameSync(appAsar, backupAsar);
    }
    copyFileSync(sourceAsar, appAsar);

    const expectedSize = statSync(sourceAsar).size;
    const actualSize = statSync(appAsar).size;
    if (expectedSize !== actualSize) {
        const e = new Error(`Boyut doğrulaması başarısız: ${actualSize} ≠ ${expectedSize}`);
        e.code = "VERIFY_SIZE";
        throw e;
    }

    const expectedHash = sha256(sourceAsar);
    const actualHash = sha256(appAsar);
    if (expectedHash !== actualHash) {
        const e = new Error(`SHA-256 doğrulaması başarısız:\n  beklenen ${expectedHash}\n  bulunan  ${actualHash}`);
        e.code = "VERIFY_SHA";
        throw e;
    }

    return { size: actualSize, sha256: actualHash };
}

/** `_app.asar` varsa geri adlandır, bizimkini sil; dev enjeksiyonu da temizle. */
export function uninstallAsar(install) {
    const { backupAsar, appAsar, devAppDir } = install;

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
