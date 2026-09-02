/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/**
 * Başsız / etkileşimli kurulum:
 *   MCordInstaller.exe --branch=stable --yes
 *   MCordInstaller.exe --uninstall
 *   MCordInstaller.exe --repair --branch=canary --yes
 */

import { dirname, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

import {
    closeDiscord,
    detectInstalls,
    install,
    launchDiscord,
    repair,
    uninstall
} from "./core/index.mjs";
import { resolveSourceAsar } from "./core/source.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

export async function runCli(argv = process.argv.slice(2)) {
    const UNINSTALL = argv.includes("--uninstall");
    const REPAIR = argv.includes("--repair");
    const YES = argv.includes("--yes") || argv.includes("-y");
    const branchArg = argv.find(a => a.startsWith("--branch="))?.split("=")[1];

    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const ask = async q => (YES ? "" : (await rl.question(q)).trim());
    const confirm = async q => (YES ? true : (await ask(`${q} [E/h] `)).toLowerCase() !== "h");
    const log = line => console.log(`  · ${line}`);

    const runAction = (id, source) => UNINSTALL
        ? uninstall(id, log)
        : (REPAIR ? repair : install)(id, source, log);

    try {
        console.log("MCord kurulum aracı\n");
        console.log("MCord bir istemci modudur ve Discord'un Kullanım Şartları'na aykırıdır.\n");

        const detected = detectInstalls();
        if (!detected.ok) throw new Error(detected.message);

        let targets = detected.data;
        if (branchArg) {
            targets = targets.filter(t => t.id === branchArg);
            if (!targets.length) throw new Error(`"${branchArg}" dalı kurulu değil.`);
        } else if (targets.length > 1 && !YES) {
            targets.forEach((t, i) => console.log(`  ${i + 1}) ${t.name} — ${t.version}${t.installed ? "  [MCord kurulu]" : ""}`));
            console.log(`  ${targets.length + 1}) Hepsi\n`);
            const choice = Number.parseInt(await ask("Seçim (numara): "), 10);
            if (choice >= 1 && choice <= targets.length) targets = [targets[choice - 1]];
            else if (choice !== targets.length + 1) throw new Error("Geçersiz seçim.");
        }

        const source = UNINSTALL ? null : resolveSourceAsar(join(HERE, "core"));

        for (const target of targets) {
            const label = UNINSTALL ? "kaldırılıyor" : REPAIR ? "onarılıyor" : "kuruluyor";
            console.log(`\n${target.name} ${target.version} — ${label}…`);

            let res = await runAction(target.id, source);

            if (!res.ok && res.code === "DISCORD_RUNNING") {
                if (await confirm("  Discord açık. Kapatayım mı?")) {
                    const closed = await closeDiscord(target.id);
                    if (!closed.ok) {
                        console.log(`  ✘ ${closed.message}`);
                        process.exitCode = 1;
                        continue;
                    }
                    res = await runAction(target.id, source);
                } else {
                    console.log("  atlandı.");
                    continue;
                }
            }

            if (!res.ok) {
                console.log(`  ✘ [${res.code}] ${res.message}`);
                process.exitCode = 1;
                continue;
            }

            if (!UNINSTALL) {
                console.log(`  ✔ ${(res.data.size / 1024).toFixed(1)} KB — sha256 ${res.data.sha256}`);
                if (await confirm("  Discord'u başlatayım mı?")) launchDiscord(target.id);
            } else {
                console.log(res.data.restored ? "  ✔ Orijinal app.asar geri yüklendi." : "  ✔ Temizlendi.");
            }
        }

        console.log("\n✔ Bitti.");
    } catch (e) {
        console.error(`\n✘ ${e.message}`);
        process.exitCode = 1;
    } finally {
        rl.close();
    }
}
