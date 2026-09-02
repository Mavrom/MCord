/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/**
 * Discord kurulumlarını bulma ve süreç kontrolü.
 *
 * `%LocalAppData%` kullanıcı alanı — yönetici hakkı gerekmiyor.
 * Süreç çağrıları `run` üzerinden enjekte edilebilir (test için mock'lanır).
 */

import { execFileSync, spawn } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export const BRANCHES = [
    { id: "stable", name: "Discord", dir: "Discord", exe: "Discord.exe" },
    { id: "ptb", name: "Discord PTB", dir: "DiscordPTB", exe: "DiscordPTB.exe" },
    { id: "canary", name: "Discord Canary", dir: "DiscordCanary", exe: "DiscordCanary.exe" }
];

export function defaultRun(file, args) {
    // stdout dışında her şey kapalı + timeout: `tasklist`/`taskkill` çıktısını
    // alırız ama torun süreçler stdio pipe'ını miras alıp bizi asamaz.
    return execFileSync(file, args, {
        encoding: "utf-8",
        windowsHide: true,
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 15_000
    });
}

export function assertWindows(platform = process.platform) {
    if (platform !== "win32") {
        throw new Error(`MCord yalnızca Windows'u destekler. Bulunan platform: ${platform}`);
    }
}

/** Kurulu her dalın en yeni `app-*` klasörünü döndürür. */
export function discoverInstalls({ localAppData = process.env.LOCALAPPDATA } = {}) {
    if (!localAppData) throw new Error("%LOCALAPPDATA% tanımlı değil.");

    const found = [];

    for (const branch of BRANCHES) {
        const branchPath = join(localAppData, branch.dir);
        if (!existsSync(branchPath)) continue;

        const versions = readdirSync(branchPath)
            .filter(name => name.startsWith("app-"))
            .filter(name => safeIsDirectory(join(branchPath, name)))
            .sort(compareVersions);

        const latest = versions.at(-1);
        if (!latest) continue;

        const resources = join(branchPath, latest, "resources");
        if (!existsSync(resources)) continue;

        found.push({
            ...branch,
            version: latest,
            root: branchPath,
            resources,
            appAsar: join(resources, "app.asar"),
            backupAsar: join(resources, "_app.asar"),
            markerFile: join(resources, "mcord.json"),
            devAppDir: join(resources, "app"),
            // Squirrel launcher (kök) + sürümlü gerçek exe (yedek).
            updateExe: join(branchPath, "Update.exe"),
            appExe: join(branchPath, latest, branch.exe)
        });
    }

    return found;
}

export function isRunning(exeName, { run = defaultRun } = {}) {
    try {
        const output = run("tasklist", ["/FI", `IMAGENAME eq ${exeName}`]);
        return output.toLowerCase().includes(exeName.toLowerCase());
    } catch {
        return false;
    }
}

export function killDiscord(exeName, { run = defaultRun } = {}) {
    try {
        run("taskkill", ["/F", "/IM", exeName]);
        return true;
    } catch {
        return false;
    }
}

export function launchDiscord(install, { spawnFn = spawn } = {}) {
    // Önce Squirrel launcher (`Update.exe --processStart Discord.exe`), yoksa
    // sürümlü exe. Tamamen ayrık başlat — yoksa Discord stdio'yu miras alıp asar.
    const attempts = existsSync(install.updateExe)
        ? [[install.updateExe, ["--processStart", install.exe]], [install.appExe, []]]
        : [[install.appExe, []]];

    for (const [file, args] of attempts) {
        if (!existsSync(file)) continue;
        try {
            const child = spawnFn(file, args, { detached: true, stdio: "ignore" });
            child.on("error", () => {});
            child.unref();
            return true;
        } catch { /* sıradaki */ }
    }
    return false;
}

function safeIsDirectory(path) {
    try {
        return statSync(path).isDirectory();
    } catch {
        return false;
    }
}

/** `app-1.0.10` > `app-1.0.9` — sayısal parça parça. */
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
    return dirName.slice("app-".length).split(".").map(part => Number.parseInt(part, 10) || 0);
}
