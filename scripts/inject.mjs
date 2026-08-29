/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/**
 * Geliştirme enjeksiyonu (plan Faz 1).
 *
 * Son kullanıcı installer'ından (plan §12) farklı olarak burada `app.asar`'a
 * dokunmuyoruz. Electron `resources/app/` klasörünü `resources/app.asar`
 * dosyasına tercih ettiği için, dev derlemesini o klasöre yazmak yeterli.
 *
 * Bu, `src/main/index.ts`'teki asar yönlendirme mantığıyla doğal olarak uyumlu:
 *   require.main.path = ...\resources\app        (".asar" ile bitmiyor)
 *   → asarName = "app.asar"
 *   → asarPath = ...\resources\app.asar          (orijinal Discord, dokunulmamış)
 *
 * Geri alma tek klasör silmek: `pnpm uninject`.
 */

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { DIST, PackageJson } from "./build/common.mjs";

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

for (const install of installs) {
    if (UNINJECT) uninject(install);
    else inject(install);
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

        found.push({ branch: branch.name, version: latest, resources });
    }

    return found;
}

function inject({ branch, version, resources }) {
    if (!existsSync(join(DIST, "patcher.js"))) {
        console.error("[MCord] dist/ boş. Önce `pnpm buildDev` veya `pnpm watch` çalıştır.");
        process.exit(1);
    }

    const appDir = join(resources, "app");

    rmSync(appDir, { recursive: true, force: true });
    mkdirSync(appDir, { recursive: true });

    for (const file of ["patcher.js", "preload.js", "renderer.js"]) {
        const src = join(DIST, file);
        if (existsSync(src)) cpSync(src, join(appDir, file));
    }

    writeFileSync(join(appDir, "package.json"), JSON.stringify({
        name: "mcord",
        main: "patcher.js",
        version: PackageJson.version
    }, null, 4));

    console.log(`[MCord] enjekte edildi → ${branch} ${version}\n           ${appDir}`);
}

function uninject({ branch, version, resources }) {
    const appDir = join(resources, "app");

    if (!existsSync(appDir)) {
        console.log(`[MCord] ${branch} ${version}: enjeksiyon yok, atlandı.`);
        return;
    }

    rmSync(appDir, { recursive: true, force: true });
    console.log(`[MCord] kaldırıldı ← ${branch} ${version}`);
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
