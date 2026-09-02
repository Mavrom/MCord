/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/**
 * Pencere süreci. Core'u `webview.expose("core", …)` ile açar; ilerleme
 * satırlarını `webview.evaluateScript` ile UI'a iter.
 *
 * `startGui()` döner:
 *   { opened: true }              — pencere açıldı ve kapandı
 *   { opened: false, reason }     — açılamadı (çağıran CLI'a düşer)
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
        return fail(webview2Hint(e));
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

    let webContext = null;
    try {
        webContext = app.createWebContext({ dataDirectory: join(tmpdir(), "mcord-installer-webview") });
    } catch { /* eski sürüm — varsayılan klasör */ }

    let webview;
    try {
        webview = window.createWebview({ url: "mcord://localhost/index.html", theme: Theme.Dark }, webContext);
    } catch (e) {
        try { app.exit(); } catch { /* */ }
        return fail(webview2Hint(e));
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

    try { app.exit(); } catch { /* zaten kapanıyor */ }
    return { opened: true };
}

function fail(reason) {
    return { opened: false, reason };
}

function webview2Hint(e) {
    let runtime = "yüklü değil";
    try {
        const v = getWebviewVersion();
        if (v) runtime = `yüklü (${v})`;
    } catch { /* yüklü değil */ }
    return (
        `WebView2 penceresi açılamadı (çalışma zamanı: ${runtime}). ` +
        (runtime === "yüklü değil" ? `Kur: ${WEBVIEW2_URL}. ` : "") +
        `Ayrıntı: ${e?.message ?? e}`
    );
}
