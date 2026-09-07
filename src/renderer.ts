/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import * as Api from "./api";
import { initPlugins, plugins, startAllPluginsAt, stopAllPlugins } from "./api/PluginManager";
import { flushSettings, Settings } from "./api/settings";
import * as Reporter from "./debug/reporter";
import { beginTrace, finishTrace, traces } from "./debug/tracer";
import * as Patcher from "./patcher";
import { Logger } from "./utils/logger";
import { StartAt } from "./utils/types";
import * as Webpack from "./webpack";
import { initCodePatcher } from "./webpack/codePatcher";
import { byKeys } from "./webpack/filters";
import { find } from "./webpack/finder";
import { initWebpackIntercept, onceReady } from "./webpack/intercept";
import { configureEagerPatching } from "./webpack/proxy";

const logger = new Logger("MCord", "#c9a0f0");

beginTrace("MCord başlangıç");

/** Renderer tarafında da aynı ilke: bizim hatamız Discord'u kırmamalı. */
function guard(label: string, fn: () => void): void {
    try {
        fn();
    } catch (err) {
        logger.error(`${label} başarısız — Discord etkilenmemeli:\n`, err);
    }
}

// Kod patch katmanı, webpack tuzağından **önce** bağlanmalı: fabrikalar
// yakalandığı anda patch'lenebilir olsun (plan §4.2, §5.5).
guard("Kod patcher", () => initCodePatcher());

if (IS_REPORTER) guard("Reporter patch'i", () => Reporter.registerReporterPatch());

// Eager/lazy patch modu, yakalamadan önce ayarlanmalı (plan §11.1).
configureEagerPatching(Settings.eagerPatches);

// Webpack tuzağı her şeyden önce kurulur: Discord'un webpack'i `wreq.m`'i
// atadığı anda yakalıyoruz (plan §4.1).
beginTrace("webpack yakalama");
initWebpackIntercept();

/** Konsoldan erişilebilen global yüzey — geliştirme, hata ayıklama, `$self`. */
const Mcord = {
    Webpack,
    Patcher,
    Reporter,
    Api,
    Logger,
    Settings,
    Plugins: { plugins, startAllPluginsAt, stopAllPlugins },
    traces,
    version: VERSION,
    commitHash: COMMIT_HASH,
    buildTimestamp: BUILD_TIMESTAMP
};

Object.assign(window, { Mcord });

if (IS_REPORTER) captureConsoleErrors();

// Başlangıçta çöküyorsa (WebpackReady'den önce) otomatik güvenli mod (plan §8.5).
// Geçen sefer bu bayrak temizlenmeden kapandıysak bu açılış güvenli modda.
if (Settings.startupIncomplete && !Settings.safeMode) {
    Settings.safeMode = true;
    logger.error("Önceki açılış tamamlanamadı — güvenli mod etkinleştirildi.");
}
Settings.startupIncomplete = true;
flushSettings();

// Aşama 1: Init — webpack öncesi hazırlık (plan §6.4).
beginTrace("plugin hazırlığı");
guard("Plugin hazırlığı", () => {
    initPlugins();
    void startAllPluginsAt(StartAt.Init);
});
finishTrace("plugin hazırlığı");

onceReady.then(async () => {
    finishTrace("webpack yakalama");


    // Aşama 2: WebpackReady — varsayılan.
    beginTrace("pluginler (WebpackReady)");
    await startAllPluginsAt(StartAt.WebpackReady);
    finishTrace("pluginler (WebpackReady)");

    // Buraya ulaştıysak açılış başarılı: güvenli mod tetikleyicisini temizle.
    Settings.startupIncomplete = false;
    flushSettings();

    finishTrace("MCord başlangıç");
    logger.info(`${VERSION} (${COMMIT_HASH}) hazır — webpack yakalandı.`);

    // Finder sağlık kontrolü: kırık finder'ları açılıştan ~10 sn sonra konsola
    // bas. Discord güncellemesinde sessizce kırılan modülleri yakalar.
    Reporter.runClientSelfCheck();

    // Aşama 3: DOMContentLoaded — UI enjeksiyonu.
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            void startAllPluginsAt(StartAt.DOMContentLoaded);
        }, { once: true });
    } else {
        void startAllPluginsAt(StartAt.DOMContentLoaded);
    }

    // Aşama 4: ConnectionOpen — kullanıcı verisine ihtiyaç duyanlar (plan §6.4).
    guard("ConnectionOpen aşaması", () => awaitConnectionOpen());
}).catch(err => logger.error("Başlangıç akışı hata verdi:\n", err));

/**
 * `UserStore` hazır veya `CONNECTION_OPEN` dispatch edildi.
 *
 * Kullanıcı verisine ihtiyaç duyan pluginler bu aşamayı bekliyor; aksi halde
 * `setTimeout` tahminleriyle uğraşmak gerekirdi.
 */
function awaitConnectionOpen(): void {
    const dispatcher = find(byKeys(["dispatch", "subscribe", "_subscriptions"]), { silent: true });

    const fire = () => {
        void startAllPluginsAt(StartAt.ConnectionOpen);
    };

    const userStore = find(byKeys(["getCurrentUser", "getUser"]), { silent: true });
    if (userStore?.getCurrentUser?.() != null) {
        fire();
        return;
    }

    if (!dispatcher) {
        logger.warn("FluxDispatcher bulunamadı — ConnectionOpen aşaması atlandı.");
        return;
    }

    const handler = () => {
        dispatcher.unsubscribe("CONNECTION_OPEN", handler);
        fire();
    };

    dispatcher.subscribe("CONNECTION_OPEN", handler);
}

window.addEventListener("beforeunload", () => flushSettings());

/** Reporter koşusunda Discord'un kendi hatalarını da topluyoruz (plan §9.2). */
function captureConsoleErrors(): void {
    const originalError = console.error;

    console.error = function (...args: unknown[]) {
        try {
            Reporter.recordConsoleError(args.map(String).join(" "));
        } catch { /* raporlama hatası koşuyu bozmasın */ }
        return originalError.apply(this, args);
    };

    window.addEventListener("error", event => {
        Reporter.recordConsoleError(`Uncaught: ${event.message}`);
    });

    window.addEventListener("unhandledrejection", event => {
        Reporter.recordConsoleError(`Unhandled rejection: ${String(event.reason)}`);
    });
}

export default Mcord;
