/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { app, ipcMain, shell } from "electron";

import { IpcEvents } from "../shared/ipcEvents";
import { getInjectionState, patchLatest } from "./persistAfterUpdate";
import { readSettings, SETTINGS_DIR, SETTINGS_FILE, writeSettings } from "./settings";
import { discardPendingUpdate, downloadUpdate, getPendingUpdate } from "./updater";

export function registerIpc(): void {
    // Renderer bundle'ı preload tarafından senkron okunur ve executeJavaScript
    // ile enjekte edilir. Senkron olması şart: Discord'un kendi kodu çalışmadan
    // önce webpack tuzağımızın kurulmuş olması gerekiyor (plan §4.1).
    ipcMain.on(IpcEvents.GET_RENDERER_SCRIPT, event => {
        try {
            event.returnValue = readFileSync(join(__dirname, "renderer.js"), "utf-8");
        } catch (err) {
            console.error("[MCord] renderer.js okunamadı:", err);
            event.returnValue = "";
        }
    });

    ipcMain.on(IpcEvents.GET_SETTINGS_DIR, event => {
        event.returnValue = SETTINGS_DIR;
    });

    ipcMain.on(IpcEvents.GET_SETTINGS, event => {
        event.returnValue = readSettings();
    });

    ipcMain.handle(IpcEvents.SET_SETTINGS, (_event, settings: unknown) => {
        writeSettings(settings);
    });

    ipcMain.on(IpcEvents.GET_VERSION_INFO, event => {
        event.returnValue = {
            version: VERSION,
            commitHash: COMMIT_HASH,
            buildTimestamp: BUILD_TIMESTAMP,
            electronVersion: process.versions.electron,
            chromeVersion: process.versions.chrome
        };
    });

    ipcMain.handle(IpcEvents.OPEN_EXTERNAL, (_event, url: string) => {
        // Sadece http(s) — keyfi protokol çalıştırılmasını engelliyoruz.
        const { protocol } = new URL(url);
        if (protocol !== "http:" && protocol !== "https:") {
            throw new Error(`Desteklenmeyen protokol: ${protocol}`);
        }
        return shell.openExternal(url);
    });

    ipcMain.handle(IpcEvents.OPEN_SETTINGS_FOLDER, () => shell.showItemInFolder(SETTINGS_FILE));

    ipcMain.handle(IpcEvents.RELAUNCH, () => {
        app.relaunch();
        app.exit();
    });

    ipcMain.on(IpcEvents.GET_INJECTION_STATE, event => {
        try {
            event.returnValue = getInjectionState();
        } catch (err) {
            console.error("[MCord] Enjeksiyon durumu okunamadı:", err);
            event.returnValue = null;
        }
    });

    ipcMain.handle(IpcEvents.REPATCH_LATEST, () => patchLatest());

    ipcMain.on(IpcEvents.GET_PENDING_UPDATE, event => {
        event.returnValue = getPendingUpdate();
    });

    ipcMain.handle(
        IpcEvents.DOWNLOAD_UPDATE,
        (_event, url: string, sha256: string, version: string) =>
            downloadUpdate(url, sha256, version)
    );

    ipcMain.handle(IpcEvents.DISCARD_UPDATE, () => discardPendingUpdate());
}
