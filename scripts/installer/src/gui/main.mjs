/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/**
 * Pencere süreci. Core'u `webview.expose("core", …)` ile açar; ilerleme
 * satırlarını `webview.evaluateScript` ile UI'a iter.
 *
 * UI, `build.mjs`'in ürettiği tek HTML string'i — `mcord://` özel protokolüyle
 * servis edilir (data: URI boyut sınırından kaçınmak için).
 */

import { tmpdir } from "node:os";
import { join } from "node:path";

import { Application, getWebviewVersion, Theme } from "@webviewjs/webview";

import {
    closeDiscord,
    detectInstalls,
    install as coreInstall,
    launchDiscord as coreLaunch,
    repair as coreRepair,
    uninstall as coreUninstall
} from "../core/index.mjs";
import { materializeAsar } from "../core/payload.mjs";
import { UI_HTML } from "./ui.generated.mjs";

const WEBVIEW2_URL = "https://go.microsoft.com/fwlink/p/?LinkId=2124703";

export async function startGui() {
    const source = materializeAsar();

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
        new Response(UI_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } })
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
        install: async id => coreInstall(id, source, push),
        repair: async id => coreRepair(id, source, push),
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
    // Sert çıkış: webview'in native olay döngüsü süreci canlı tutabilir.
    process.exit(1);
}
