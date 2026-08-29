/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/**
 * Discord kurulumlarını bulma ve süreç kontrolü (plan §12.1, §12.2).
 *
 * `%LocalAppData%` kullanıcı alanı olduğu için **yönetici hakkı gerekmiyor**;
 * UAC istemiyoruz, gereksiz güven kaybı.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export const BRANCHES = [
    { id: "stable", name: "Discord", dir: "Discord", exe: "Discord.exe" },
    { id: "ptb", name: "Discord PTB", dir: "DiscordPTB", exe: "DiscordPTB.exe" },
    { id: "canary", name: "Discord Canary", dir: "DiscordCanary", exe: "DiscordCanary.exe" }
];

export function assertWindows() {
    if (process.platform !== "win32") {
        throw new Error(
            `MCord yalnızca Windows'u destekler (plan §0.2). Bulunan platform: ${process.platform}`
        );
    }
}

/** Kurulu her dalın en yeni `app-*` klasörünü döndürür. */
export function discoverInstalls() {
    const localAppData = process.env.LOCALAPPDATA;
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
            devAppDir: join(resources, "app"),
            executable: join(branchPath, branch.exe)
        });
    }

    return found;
}

/** Discord açıkken `app.asar` kilitli olur — süreç kontrolü zorunlu (plan §12.2). */
export function isRunning(exeName) {
    try {
        const output = execFileSync("tasklist", ["/FI", `IMAGENAME eq ${exeName}`], {
            encoding: "utf-8",
            windowsHide: true
        });
        return output.toLowerCase().includes(exeName.toLowerCase());
    } catch {
        return false;
    }
}

export function killDiscord(exeName) {
    try {
        execFileSync("taskkill", ["/F", "/IM", exeName], { stdio: "ignore", windowsHide: true });
        return true;
    } catch {
        return false;
    }
}

export function launchDiscord(executable) {
    try {
        execFileSync("cmd", ["/c", "start", "", executable], { stdio: "ignore", windowsHide: true });
        return true;
    } catch {
        return false;
    }
}

function safeIsDirectory(path) {
    try {
        return statSync(path).isDirectory();
    } catch {
        return false;
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
    return dirName.slice("app-".length).split(".").map(part => Number.parseInt(part, 10) || 0);
}
