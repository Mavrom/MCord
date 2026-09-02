/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/**
 * Giriş noktası.
 *   - Argüman varsa → CLI
 *   - Argüman yoksa (çift tıklama) → pencere; açılamazsa metin tabanlı kuruluma düş
 *
 * Her durumda: beklenmeyen hata `%TEMP%\mcord-installer-hata.log`'a yazılır ve
 * çift tıklamada konsol "Enter" beklenmeden kapanmaz (yoksa hata okunamaz).
 */

import { appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";

const argv = process.argv.slice(2);
const wantsCli = argv.some(a => a.startsWith("-"));

async function pause(text) {
    if (wantsCli || !process.stdin.isTTY) return;
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    await rl.question(`\n${text ?? "Kapatmak için Enter'a bas…"}`);
    rl.close();
}

function logError(err) {
    const line = `[${new Date().toISOString()}] ${err?.stack ?? err}\n`;
    try {
        appendFileSync(join(tmpdir(), "mcord-installer-hata.log"), line);
    } catch { /* log yazılamıyorsa sorun değil */ }
}

async function runInteractiveFallback(reason) {
    console.error("\n" + "─".repeat(48));
    console.error("Pencere açılamadı — metin tabanlı kuruluma geçiliyor.");
    if (reason) console.error(`Sebep: ${reason}`);
    console.error("─".repeat(48) + "\n");

    const { runCli } = await import("./cli.mjs");
    await runCli([]);
    await pause();
}

async function main() {
    if (wantsCli) {
        const { runCli } = await import("./cli.mjs");
        await runCli(argv);
        return;
    }

    // @webviewjs/webview YÜKLENMEDEN önce native .node yolunu kur.
    const { setupWebviewNative } = await import("./gui/native-setup.mjs");
    setupWebviewNative();

    const { startGui } = await import("./gui/main.mjs");
    const result = await startGui();
    if (!result?.opened) await runInteractiveFallback(result?.reason);
}

main().catch(async err => {
    console.error(`\n✘ ${err?.message ?? err}`);
    logError(err);
    process.exitCode = 1;
    await pause();
});
