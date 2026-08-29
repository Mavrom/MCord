#!/usr/bin/env node
/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/**
 * MCord kurulum aracı (plan §12).
 *
 *   MCordInstaller.exe            → etkileşimli kurulum
 *   MCordInstaller.exe --uninstall
 *   MCordInstaller.exe --branch=stable --yes
 */

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

import {
    assertWindows,
    discoverInstalls,
    isRunning,
    killDiscord,
    launchDiscord
} from "./discord.mjs";
import { getStatus, install, uninstall } from "./install.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

const UNINSTALL = process.argv.includes("--uninstall");
const ASSUME_YES = process.argv.includes("--yes") || process.argv.includes("-y");
const BRANCH_ARG = process.argv.find(a => a.startsWith("--branch="))?.split("=")[1];

const rl = createInterface({ input: process.stdin, output: process.stdout });

try {
    await main();
} catch (err) {
    console.error(`\n✘ ${err.message}`);
    if (!ASSUME_YES) await rl.question("\nÇıkmak için Enter'a bas…");
    process.exitCode = 1;
} finally {
    rl.close();
}

async function main() {
    assertWindows();

    console.log("MCord kurulum aracı\n");
    console.log("MCord bir istemci modudur ve Discord'un Kullanım Şartları'na aykırıdır.");
    console.log("Hesap askıya alma pratikte nadirdir ama olasılığı sıfır değildir.\n");

    const installs = discoverInstalls();

    if (installs.length === 0) {
        throw new Error("%LocalAppData% altında Discord kurulumu bulunamadı.");
    }

    // Stable, PTB, Canary aynı anda kurulu olabilir — hangisine kurulacağını sor (plan §12.2).
    const targets = await chooseTargets(installs);

    for (const target of targets) {
        await handle(target);
    }

    console.log("\n✔ Bitti.");
    if (!ASSUME_YES) await rl.question("Çıkmak için Enter'a bas…");
}

async function chooseTargets(installs) {
    if (BRANCH_ARG) {
        const match = installs.filter(i => i.id === BRANCH_ARG);
        if (match.length === 0) throw new Error(`"${BRANCH_ARG}" dalı kurulu değil.`);
        return match;
    }

    if (installs.length === 1 || ASSUME_YES) return installs;

    console.log("Bulunan Discord kurulumları:\n");
    installs.forEach((item, index) => {
        const status = getStatus(item);
        console.log(`  ${index + 1}) ${item.name} — ${item.version}${status.installed ? "  [MCord kurulu]" : ""}`);
    });
    console.log(`  ${installs.length + 1}) Hepsi\n`);

    const answer = await rl.question("Seçim (numara): ");
    const choice = Number.parseInt(answer.trim(), 10);

    if (choice === installs.length + 1) return installs;
    if (choice >= 1 && choice <= installs.length) return [installs[choice - 1]];

    throw new Error("Geçersiz seçim.");
}

async function handle(target) {
    const status = getStatus(target);
    const action = UNINSTALL ? "kaldırılıyor" : "kuruluyor";

    console.log(`\n${target.name} ${target.version} — ${action}…`);

    if (UNINSTALL && !status.installed && !status.hasDevInjection) {
        console.log("  MCord kurulu değil, atlandı.");
        return;
    }

    if (!(await ensureClosed(target))) {
        console.log("  Discord açık, atlandı.");
        return;
    }

    if (UNINSTALL) {
        const { restored } = uninstall(target);
        console.log(restored ? "  ✔ Orijinal app.asar geri yüklendi." : "  ✔ Temizlendi.");
        return;
    }

    const source = resolveSourceAsar();
    const result = install(target, source);

    console.log(`  ✔ Kuruldu — ${(result.size / 1024).toFixed(1)} KB`);
    console.log(`    sha256: ${result.sha256}`);

    if (await confirm("  Discord'u şimdi başlatayım mı?")) {
        launchDiscord(target.executable);
    }
}

/** Discord açıkken `app.asar` kilitli olur (plan §12.2). */
async function ensureClosed(target) {
    if (!isRunning(target.exe)) return true;

    if (!(await confirm(`  ${target.name} açık. Kapatayım mı?`))) return false;

    killDiscord(target.exe);

    // Süreç kapanana kadar kısa bir bekleme.
    for (let i = 0; i < 20; i++) {
        if (!isRunning(target.exe)) return true;
        await sleep(250);
    }

    console.log("  ! Discord kapanmadı.");
    return false;
}

function resolveSourceAsar() {
    // pkg ile paketlendiğinde asset yürütülebilirin yanında; kaynaktan
    // çalıştırıldığında repo `dist/` klasöründe.
    const candidates = [
        join(HERE, "app.asar"),
        join(dirname(process.execPath), "app.asar"),
        join(HERE, "..", "..", "..", "dist", "app.asar")
    ];

    for (const candidate of candidates) {
        if (existsSync(candidate)) return candidate;
    }

    throw new Error(
        "app.asar bulunamadı. Kaynaktan çalıştırıyorsan önce `pnpm dist` komutunu çalıştır."
    );
}

async function confirm(question) {
    if (ASSUME_YES) return true;
    const answer = await rl.question(`${question} [E/h] `);
    return answer.trim().toLowerCase() !== "h";
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
