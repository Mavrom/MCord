/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/**
 * Giriş noktası.
 *   - Argüman varsa → CLI (metin)
 *   - Argüman yoksa (çift tıklama) → pencere
 *
 * Exe GUI subsystem'e patch'lendiği için çift tıklamada terminal AÇILMAZ.
 * Pencere açılamazsa: hata `%TEMP%\mcord-installer-hata.log`'a yazılır ve
 * bir Windows mesaj kutusu gösterilir (konsol olmadığı için).
 */

import { spawn } from "node:child_process";
import { appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const argv = process.argv.slice(2);
const wantsCli = argv.some(a => a.startsWith("-"));
const LOG = join(tmpdir(), "mcord-installer-hata.log");

function logError(err) {
    try {
        appendFileSync(LOG, `[${new Date().toISOString()}] ${err?.stack ?? err}\n`);
    } catch { /* log yazılamıyorsa sorun değil */ }
}

/** GUI subsystem'de konsol yok — hatayı mesaj kutusuyla göster. */
function messageBox(text) {
    try {
        const escaped = String(text).replace(/'/g, "''");
        spawn(
            "powershell",
            [
                "-NoProfile", "-WindowStyle", "Hidden", "-Command",
                "Add-Type -AssemblyName PresentationFramework;" +
                `[System.Windows.MessageBox]::Show('${escaped}','MCord Kurulum')`
            ],
            { detached: true, stdio: "ignore", windowsHide: true }
        ).unref();
    } catch { /* powershell yoksa sadece log kalır */ }
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

    if (!result?.opened) {
        logError(result?.reason ?? "bilinmeyen");
        messageBox(
            "MCord Kurulum penceresi açılamadı.\n\n" +
            `${result?.reason ?? ""}\n\n` +
            "Komut satırından dene:\n" +
            "MCordInstaller.exe --branch=stable --yes\n\n" +
            `Log: ${LOG}`
        );
        process.exit(1);
    }

    // Pencere kapandı — webview'in native döngüsü handle sızdırabilir, sert çık.
    process.exit(0);
}

main().catch(err => {
    console.error(`\n✘ ${err?.message ?? err}`);
    logError(err);
    if (!wantsCli) {
        messageBox(`MCord Kurulum hata verdi:\n\n${err?.message ?? err}\n\nLog: ${LOG}`);
    }
    process.exitCode = 1;
});
