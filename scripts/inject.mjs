/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/**
 * Geliştirme enjeksiyonu (plan Faz 1).
 *
 * **Electron `app.asar`'ı `app/` klasörüne TERCİH EDER.** Bu dosyanın eski
 * sürümü tersini varsayıyordu (`resources/app/` yazıp `app.asar`'a
 * dokunmuyordu); her Discord kurulumunda zaten gerçek bir `app.asar`
 * bulunduğu için o enjeksiyon hiçbir zaman devreye girmiyordu — Discord eski
 * kodu çalıştırmaya devam ediyordu ve bu, sürüm karışıklığına yol açıyordu.
 *
 * Artık installer'ın (plan §12) yaptığının aynısını yapıyoruz:
 *   1. `dist/` → `dist/app.asar` paketle
 *   2. `app.asar` → `_app.asar` (yedek yoksa; orijinal Discord)
 *   3. Bizim asar'ı `app.asar` olarak kopyala + SHA-256 doğrula
 *   4. `resources/mcord.json` işaret dosyası
 *   5. Eski, işe yaramayan `resources/app/` klasörünü temizle
 *
 * `app.asar` Discord açıkken kilitli — kopyalama başarısız olursa Discord'u
 * kapatman gerektiğini söylüyoruz (zorla kapatma YOK).
 *
 * Geri alma: `pnpm uninject` → `_app.asar` geri adlandırılır.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

import { DIST, ROOT } from "./build/common.mjs";
import { installAsar, uninstallAsar } from "./installer/src/core/install.mjs";

const UNINJECT = process.argv.includes("--uninject");

const BRANCHES = [
    { name: "Discord", dir: "Discord" },
    { name: "Discord PTB", dir: "DiscordPTB" },
    { name: "Discord Canary", dir: "DiscordCanary" }
];

if (process.platform !== "win32") {
    console.error(
        "[MCord] inject sadece Windows'ta çalışır (plan §0.2: Linux/macOS kapsam dışı).\n" +
        `        Bulunan platform: ${process.platform}`
    );
    process.exit(1);
}

const localAppData = process.env.LOCALAPPDATA;
if (!localAppData) {
    console.error("[MCord] %LOCALAPPDATA% tanımlı değil.");
    process.exit(1);
}

const installs = discoverInstalls();

if (!installs.length) {
    console.error(`[MCord] %LocalAppData% altında Discord kurulumu bulunamadı: ${localAppData}`);
    process.exit(1);
}

if (UNINJECT) {
    for (const install of installs) uninject(install);
} else {
    packAsar();
    let failed = false;
    for (const install of installs) failed = !inject(install) || failed;
    if (failed) process.exit(1);
}

/** `%LocalAppData%\Discord*\app-<sürüm>\resources` — her dalın en yeni sürümü. */
function discoverInstalls() {
    const found = [];

    for (const branch of BRANCHES) {
        const branchPath = join(localAppData, branch.dir);
        if (!existsSync(branchPath)) continue;

        const versions = readdirSync(branchPath)
            .filter(name => name.startsWith("app-"))
            .filter(name => statSync(join(branchPath, name)).isDirectory())
            .sort(compareVersions);

        const latest = versions.at(-1);
        if (!latest) continue;

        const resources = join(branchPath, latest, "resources");
        if (!existsSync(resources)) continue;

        found.push({
            branch: branch.name,
            version: latest,
            resources,
            appAsar: join(resources, "app.asar"),
            backupAsar: join(resources, "_app.asar"),
            markerFile: join(resources, "mcord.json"),
            devAppDir: join(resources, "app")
        });
    }

    return found;
}

/** `dist/` → `dist/app.asar`. Ayrı süreç: `packAsar.mjs` üst düzey `await` kullanıyor. */
function packAsar() {
    if (!existsSync(join(DIST, "patcher.js"))) {
        console.error("[MCord] dist/ boş. Önce `pnpm build` veya `pnpm watch` çalıştır.");
        process.exit(1);
    }

    execFileSync(process.execPath, [join(ROOT, "scripts", "packAsar.mjs")], { stdio: "inherit" });
}

function inject({ branch, version, devAppDir, ...install }) {
    const source = join(DIST, "app.asar");

    try {
        const { size } = installAsar({ devAppDir, ...install }, source);

        // Eski (etkisiz) dev enjeksiyonu kalıntısı — iki farklı MCord sürümü
        // yan yana durunca hangisinin yüklendiği anlaşılmıyor.
        rmSync(devAppDir, { recursive: true, force: true });

        console.log(
            `[MCord] enjekte edildi → ${branch} ${version} — ${(size / 1024).toFixed(1)} KB\n` +
            `           ${install.appAsar}`
        );
        return true;
    } catch (err) {
        if (err.code === "EBUSY" || err.code === "EPERM" || err.code === "EACCES") {
            console.error(
                `[MCord] ${branch} ${version}: app.asar kilitli — ${branch} açık.\n` +
                "        Sistem tepsisinden tamamen çık (sağ tık → Quit), sonra tekrar dene."
            );
        } else {
            console.error(`[MCord] ${branch} ${version} enjekte edilemedi: ${err.message}`);
        }
        return false;
    }
}

function uninject({ branch, version, ...install }) {
    try {
        const { restored } = uninstallAsar(install);
        console.log(restored
            ? `[MCord] kaldırıldı ← ${branch} ${version} (orijinal app.asar geri yüklendi)`
            : `[MCord] ${branch} ${version}: yedek yok, sadece işaretler temizlendi.`);
    } catch (err) {
        console.error(`[MCord] ${branch} ${version} kaldırılamadı: ${err.message}`);
    }
}

/** `app-1.0.10` > `app-1.0.9` — string değil, sayısal parça parça (plan §3.6). */
function compareVersions(a, b) {
    const pa = parseVersion(a);
    const pb = parseVersion(b);

    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
        if (diff !== 0) return diff;
    }

    return 0;
}

function parseVersion(dirName) {
    return dirName
        .slice("app-".length)
        .split(".")
        .map(part => Number.parseInt(part, 10) || 0);
}
