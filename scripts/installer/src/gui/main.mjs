/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/**
 * Pencere süreci. Core'u `webview.expose("core", …)` ile açar; ilerleme
 * satırlarını `webview.evaluateScript` ile UI'a iter.
 *
 * UI, esbuild'in ürettiği tek `dist-ui/index.html` — `mcord://` özel
 * protokolüyle servis edilir (data: URI boyut sınırından kaçınmak için).
 */

import { existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { Application, getWebviewVersion, Theme } from "@webviewjs/webview";

import {
    closeDiscord,
    detectInstalls,
    install as coreInstall,
    launchDiscord as coreLaunch,
    repair as coreRepair,
    uninstall as coreUninstall
} from "../core/index.mjs";
import { resolveSourceAsar } from "../core/source.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

const WEBVIEW2_URL = "https://go.microsoft.com/fwlink/p/?LinkId=2124703";

function loadUiHtml() {
    const candidates = [
        join(HERE, "..", "..", "dist-ui", "index.html"),
        join(dirname(process.execPath), "dist-ui", "index.html")
    ];
    for (const c of candidates) {
        if (existsSync(c)) return readFileSync(c, "utf-8");
    }
    throw new Error("dist-ui/index.html bulunamadı — `pnpm --filter mcord-installer build` çalıştır.");
}

function sourceOrNull() {
    try {
        return resolveSourceAsar(join(HERE, "..", "core"));
    } catch {
        return null;
    }
}

function missingSource() {
    return { ok: false, code: "SOURCE_NOT_FOUND", message: "MCord paketi (app.asar) bulunamadı." };
}

async function main() {
    let html;
    try {
        html = loadUiHtml();
    } catch (e) {
        console.error(e.message);
        process.exitCode = 1;
        return;
    }

    const source = sourceOrNull();

    let app;
    try {
        app = new Application();
    } catch (e) {
        bailNoWebview(e);
        return;
    }

    const window = app.createBrowserWindow({
        title: "MCord Kurulum",
        width: 520,
        height: 660,
        resizable: false
    });

    window.registerProtocol("mcord", () =>
        new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } })
    );

    // WebView2 kullanıcı-veri klasörü yazılabilir bir yerde olmalı; exe yanı
    // (Program Files vb.) çoğu zaman engelli — E_ACCESSDENIED verir.
    let webContext = null;
    try {
        webContext = app.createWebContext({ dataDirectory: join(tmpdir(), "mcord-installer-webview") });
    } catch { /* eski sürüm — varsayılan klasörle devam */ }

    let webview;
    try {
        webview = window.createWebview({ url: "mcord://localhost/index.html", theme: Theme.Dark }, webContext);
    } catch (e) {
        bailNoWebview(e);
        return;
    }

    const push = line => {
        try {
            webview.evaluateScript(
                `window.__mcordProgress && window.__mcordProgress(${JSON.stringify(String(line))})`
            );
        } catch { /* pencere kapanmış olabilir */ }
    };

    webview.expose("core", {
        detectInstalls: async () => detectInstalls(),
        install: async id => (source ? coreInstall(id, source, push) : missingSource()),
        repair: async id => (source ? coreRepair(id, source, push) : missingSource()),
        uninstall: async id => coreUninstall(id, push),
        closeDiscord: async id => closeDiscord(id),
        launchDiscord: async id => coreLaunch(id)
    });

    const closed = new Promise(resolve => {
        app.on("window-close-requested", resolve);
        app.on("application-close-requested", resolve);
    });

    await app.whenReady({ interval: 16, ref: true });
    await closed;

    try {
        app.exit();
    } catch { /* zaten kapanıyor */ }
    process.exit(0);
}

function bailNoWebview(e) {
    let runtime = "yüklü değil";
    try {
        const v = getWebviewVersion();
        if (v) runtime = `yüklü (${v})`;
    } catch { /* yüklü değil */ }

    console.error(
        "MCord Kurulum penceresi açılamadı.\n" +
        `WebView2 çalışma zamanı: ${runtime}\n` +
        `Yüklü değilse indir: ${WEBVIEW2_URL}\n` +
        `Ayrıntı: ${e?.message ?? e}\n\n` +
        "Alternatif: bu dosyayı komut satırından çalıştır:\n" +
        "  MCordInstaller.exe --branch=stable --yes"
    );
    process.exitCode = 1;
}

main().catch(err => {
    console.error(err);
    process.exitCode = 1;
});
