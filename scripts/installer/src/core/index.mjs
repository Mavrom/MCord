/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/** GUI ve CLI'ın paylaştığı dış API. Hepsi Result döndürür, throw etmez. */

import {
    assertWindows,
    discoverInstalls,
    isRunning,
    killDiscord,
    launchDiscord as launch
} from "./discord.mjs";
import { getStatus, installAsar, uninstallAsar } from "./install.mjs";
import { err, ok } from "./result.mjs";

const sleep = ms => new Promise(r => setTimeout(r, ms));

function findInstall(branchId, deps) {
    const all = discoverInstalls(deps);
    if (!all.length) return { error: err("NO_DISCORD", "%LocalAppData% altında Discord kurulumu bulunamadı.") };
    const match = all.find(i => i.id === branchId);
    if (!match) return { error: err("BRANCH_NOT_FOUND", `"${branchId}" dalı kurulu değil.`) };
    return { install: match };
}

export function detectInstalls(deps = {}) {
    try {
        assertWindows(deps.platform);
        const all = discoverInstalls(deps);
        if (!all.length) return err("NO_DISCORD", "%LocalAppData% altında Discord kurulumu bulunamadı.");
        return ok(all.map(i => {
            const s = getStatus(i);
            return {
                id: i.id,
                name: i.name,
                version: i.version,
                installed: s.installed,
                otherMod: s.otherMod,
                hasDevInjection: s.hasDevInjection,
                running: isRunning(i.exe, deps)
            };
        }));
    } catch (e) {
        return err("INTERNAL", e.message);
    }
}

function doInstall(branchId, sourceAsar, onProgress, deps, { force }) {
    try {
        const { install, error } = findInstall(branchId, deps);
        if (error) return error;

        if (isRunning(install.exe, deps)) {
            return err("DISCORD_RUNNING", `${install.name} açık. app.asar kilitli.`);
        }

        const status = getStatus(install);
        if (status.installed && !force) {
            onProgress("Zaten kurulu, yeniden yazılıyor…");
        }

        onProgress("Yedekleniyor…");
        onProgress("Kopyalanıyor…");
        const result = installAsar(install, sourceAsar);
        onProgress(`Boyut doğrulandı — ${(result.size / 1024).toFixed(1)} KB`);
        onProgress(`SHA-256 doğrulandı — ${result.sha256.slice(0, 16)}…`);
        return ok(result);
    } catch (e) {
        return err(e.code ?? "INTERNAL", e.message);
    }
}

export function install(branchId, sourceAsar, onProgress = () => {}, deps = {}) {
    return doInstall(branchId, sourceAsar, onProgress, deps, { force: false });
}

export function repair(branchId, sourceAsar, onProgress = () => {}, deps = {}) {
    return doInstall(branchId, sourceAsar, onProgress, deps, { force: true });
}

export function uninstall(branchId, onProgress = () => {}, deps = {}) {
    try {
        const { install: target, error } = findInstall(branchId, deps);
        if (error) return error;

        if (isRunning(target.exe, deps)) {
            return err("DISCORD_RUNNING", `${target.name} açık. app.asar kilitli.`);
        }

        const status = getStatus(target);
        if (!status.installed && !status.hasDevInjection) {
            return err("NOT_INSTALLED", "MCord kurulu değil.");
        }

        onProgress("Kaldırılıyor…");
        const result = uninstallAsar(target);
        onProgress(result.restored ? "Orijinal app.asar geri yüklendi." : "Temizlendi.");
        return ok(result);
    } catch (e) {
        return err(e.code ?? "INTERNAL", e.message);
    }
}

export async function closeDiscord(branchId, deps = {}) {
    try {
        const { install: target, error } = findInstall(branchId, deps);
        if (error) return error;
        if (!isRunning(target.exe, deps)) return ok({});

        killDiscord(target.exe, deps);

        for (let i = 0; i < 20; i++) {
            if (!isRunning(target.exe, deps)) return ok({});
            await sleep(250);
        }
        return err("DISCORD_STILL_RUNNING", "Discord kapanmadı.");
    } catch (e) {
        return err(e.code ?? "INTERNAL", e.message);
    }
}

export function launchDiscord(branchId, deps = {}) {
    try {
        const { install: target, error } = findInstall(branchId, deps);
        if (error) return error;
        launch(target, deps);
        return ok({});
    } catch (e) {
        return err(e.code ?? "INTERNAL", e.message);
    }
}
