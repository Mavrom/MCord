/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { join } from "node:path";

import electron, { app, type BrowserWindowConstructorOptions } from "electron";

import { getMainSettings } from "./settings";

/**
 * Discord'un `BrowserWindow` sınıfını sarmalar ve preload'ımızı enjekte eder
 * (plan §3.2). `require.cache` üzerinden electron modülünün export'u değiştirilir,
 * böylece Discord'un `require("electron").BrowserWindow` çağrısı bizimkini alır.
 */
export function patchBrowserWindow(): void {
    const settings = getMainSettings();

    class BrowserWindow extends electron.BrowserWindow {
        constructor(options: BrowserWindowConstructorOptions) {
            // Discord birden fazla BrowserWindow açıyor (splash, overlay).
            // Sadece preload + title'ı olan asıl pencereye dokunuyoruz. (kritik detay 1)
            if (!options?.webPreferences?.preload || !options.title) {
                super(options);
                return;
            }

            const original = options.webPreferences.preload;

            options.webPreferences.preload = join(__dirname, "preload.js");
            // Preload'ımızın Node erişimi için şart; bilinçli bir ödün (plan §13).
            options.webPreferences.sandbox = false;

            if (settings.disableBackgroundThrottling) {
                options.webPreferences.backgroundThrottling = false;
            }

            applyWindowsWindowOptions(options);

            // Discord'un kendi preload'ı; preload.ts bunu sonradan require ediyor.
            process.env.DISCORD_PRELOAD = original;

            super(options);

            if (settings.disableMinSize) {
                // Discord runtime'da minimum boyutu geri set ediyor; override şart (plan §3.3).
                this.setMinimumSize = () => { };
            }
        }
    }

    // Statik metotlar (getAllWindows, fromWebContents, ...) devrediliyor. (kritik detay 2)
    Object.assign(BrowserWindow, electron.BrowserWindow);

    // esbuild sınıfı yeniden adlandırabiliyor; Electron'un getFocusedWindow()
    // implementasyonu sınıf adına bakıyor. Bu satır olmadan pencere odak yönetimi
    // bozuluyor. (kritik detay 3)
    Object.defineProperty(BrowserWindow, "name", { value: "BrowserWindow", configurable: true });

    const electronPath = require.resolve("electron");
    delete require.cache[electronPath]!.exports;
    require.cache[electronPath]!.exports = { ...electron, BrowserWindow };
}

/** Windows'a özel pencere ayarları (plan §3.3). */
function applyWindowsWindowOptions(options: BrowserWindowConstructorOptions): void {
    const { frameless, winNativeTitleBar, disableMinSize, transparent, windowsMaterial } = getMainSettings();

    if (frameless) {
        options.frame = false;
    } else if (winNativeTitleBar) {
        delete options.frame;
    }

    if (disableMinSize) {
        options.minWidth = 0;
        options.minHeight = 0;
    }

    if (transparent) {
        options.transparent = true;
        options.backgroundColor = "#00000000";
    }

    if (windowsMaterial !== "none") {
        options.backgroundMaterial = windowsMaterial;
        options.backgroundColor = "#00000000";
    }
}

/**
 * Arka plan boşaltma sorunu (plan §3.4).
 *
 * Discord pencere arka plana geçince renderer'ı askıya alıyor; kullanıcı geri
 * dönünce donma yaşıyor. Dört ayrı yerden kapatılıyor — biri pencere bazlı
 * (`backgroundThrottling`, yukarıda), üçü komut satırı anahtarı.
 *
 * `appendSwitch` monkey-patch'i gerekli çünkü Discord kendi `disable-features`
 * listesini sonradan set ediyor; doğrudan çağırsak üzerine yazılıyor.
 */
export function disableBackgroundThrottling(): void {
    if (!getMainSettings().disableBackgroundThrottling) return;

    const originalAppend = app.commandLine.appendSwitch;
    app.commandLine.appendSwitch = function (this: unknown, ...args: [string, string?]) {
        if (args[0] === "disable-features") {
            const disabledFeatures = new Set((args[1] ?? "").split(","));
            disabledFeatures.add("UseEcoQoSForBackgroundProcess");
            // Bilinçli olarak `+=`: eklenen liste orijinalin üst kümesi olduğu
            // için tüm özellikler korunuyor; birleşme noktasında oluşan tek
            // geçersiz ad (ör. "a,b" + "a,b,UseEco…" → "…,ba,…") Chromium
            // tarafından yok sayılıyor.
            args[1] += [...disabledFeatures].join(",");
        }
        return originalAppend.apply(this as never, args as never);
    } as typeof app.commandLine.appendSwitch;

    app.commandLine.appendSwitch("disable-renderer-backgrounding");
    app.commandLine.appendSwitch("disable-background-timer-throttling");
    app.commandLine.appendSwitch("disable-backgrounding-occluded-windows");
}
