/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { contextBridge, ipcRenderer, webFrame } from "electron";

import { IpcEvents } from "./shared/ipcEvents";
import type { InjectionState, McordNative, PendingUpdate, VersionInfo } from "./shared/nativeBridge";

const McordNativeBridge: McordNative = {
    settings: {
        getSettingsDir: () => ipcRenderer.sendSync(IpcEvents.GET_SETTINGS_DIR) as string,
        get: () => ipcRenderer.sendSync(IpcEvents.GET_SETTINGS) as Record<string, unknown>,
        set: settings => ipcRenderer.invoke(IpcEvents.SET_SETTINGS, settings),
        openFolder: () => ipcRenderer.invoke(IpcEvents.OPEN_SETTINGS_FOLDER)
    },
    app: {
        getVersionInfo: () => ipcRenderer.sendSync(IpcEvents.GET_VERSION_INFO) as VersionInfo,
        relaunch: () => ipcRenderer.invoke(IpcEvents.RELAUNCH),
        openExternal: url => ipcRenderer.invoke(IpcEvents.OPEN_EXTERNAL, url)
    },
    injection: {
        getState: () => ipcRenderer.sendSync(IpcEvents.GET_INJECTION_STATE) as InjectionState | null,
        repatchLatest: () => ipcRenderer.invoke(IpcEvents.REPATCH_LATEST)
    },
    updater: {
        getPending: () => ipcRenderer.sendSync(IpcEvents.GET_PENDING_UPDATE) as PendingUpdate | null,
        download: (url, sha256, version) =>
            ipcRenderer.invoke(IpcEvents.DOWNLOAD_UPDATE, url, sha256, version),
        discard: () => ipcRenderer.invoke(IpcEvents.DISCARD_UPDATE)
    }
};

try {
    contextBridge.exposeInMainWorld("McordNative", McordNativeBridge);
} catch (err) {
    console.error("[MCord] contextBridge açılamadı:", err);
}

// `data:` protokolü Discord'un splash/overlay pencerelerinde kullanılıyor —
// oraya renderer'ı enjekte etmiyoruz.
if (location.protocol !== "data:") {
    const rendererScript = ipcRenderer.sendSync(IpcEvents.GET_RENDERER_SCRIPT) as string;

    if (rendererScript) {
        try {
            // Senkron çalıştırma şart: Discord'un webpack'i başlamadan önce
            // `Function.prototype.m` tuzağımızın kurulmuş olması gerekiyor (plan §4.1).
            webFrame.executeJavaScript(rendererScript);
        } catch (err) {
            // Renderer patlasa bile Discord açılmaya devam etmeli.
            console.error("[MCord] Renderer yüklenemedi:", err);
        }
    } else {
        console.error("[MCord] renderer.js boş döndü — mod yüklenmedi.");
    }

    // Discord'un kendi preload'ı; browserWindow.ts bunu env'e koymuştu.
    // Bayrak yoksa `require(undefined)` Discord'u komple kırar — koşulla.
    const discordPreload = process.env.DISCORD_PRELOAD;
    if (discordPreload) {
        require(discordPreload);
    } else {
        console.error("[MCord] DISCORD_PRELOAD tanımsız — Discord'un kendi preload'ı yüklenemedi.");
    }
}
