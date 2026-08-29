/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { dirname, join, resolve } from "node:path";

import { app } from "electron";

import { onceDefined } from "../shared/onceDefined";

console.log(`[MCord] ${VERSION} (${COMMIT_HASH}) yükleniyor…`);

/**
 * Katman 1 — Windows enjeksiyonu (plan §3.1).
 *
 * Installer `resources/app.asar`'ı `_app.asar` olarak yeniden adlandırıp yerine
 * bizimkini koydu. Bizim giriş noktamız çalışıyor, işini yapıyor, sonra orijinal
 * Discord'u yüklüyor.
 */
const injectorPath = require.main!.filename;
const ourDir = dirname(injectorPath);

/**
 * Orijinal Discord asar'ını bulur.
 *
 * İki kurulum düzeni var ve ikisi de desteklenmeli:
 *   installer  → bizimki `resources/app.asar`, orijinal `resources/_app.asar`
 *   dev inject → bizimki `resources/app/`,     orijinal `resources/app.asar`
 *
 * Birincil tahmin tutmazsa diğerini deniyoruz. Bu tek nokta yanlış çözülürse
 * Discord **hiç açılmaz**, o yüzden burada cömert davranıyoruz.
 */
function resolveDiscordAsar(): { asarPath: string; main: string } {
    const primary = require.main!.path.endsWith("app.asar") ? "_app.asar" : "app.asar";
    const fallback = primary === "_app.asar" ? "app.asar" : "_app.asar";
    const tried: string[] = [];

    for (const name of [primary, fallback]) {
        const candidate = join(ourDir, "..", name);
        tried.push(candidate);

        // Kendimizi yüklemeyelim — sonsuz özyineleme olur.
        if (resolve(candidate) === resolve(ourDir)) continue;

        try {
            const pkg = require(join(candidate, "package.json"));
            if (pkg?.main) return { asarPath: candidate, main: pkg.main };
        } catch { /* sıradakini dene */ }
    }

    const message =
        "Orijinal Discord app.asar bulunamadı.\n\n"
        + "Denenen yollar:\n  " + tried.join("\n  ") + "\n\n"
        + "Kurulum bozulmuş olabilir. Düzeltmek için MCord kaldırıcısını çalıştırın "
        + "veya Discord'u yeniden kurun.";

    // Konsolu kimse görmüyor olabilir; yerel bir kutu ile net söyle.
    try {

        require("electron").dialog?.showErrorBox("MCord — kurulum hatası", message);
    } catch { /* dialog yoksa sessiz geç */ }

    throw new Error(message);
}

const { asarPath, main: discordMain } = resolveDiscordAsar();
require.main!.filename = join(asarPath, discordMain);

// `setAppPath` Electron tarafından belgelenmiyor, tip tanımlarında yok — ama var.
(app as any).setAppPath(asarPath);

/**
 * MCord kurulumunun **tamamı** tek bir try/catch içinde.
 *
 * Plan §5.6'nın "en kötü senaryo: plugin çalışmaz, Discord çalışır" ilkesi main
 * process'e de uygulanıyor: burada ne patlarsa patlasın, aşağıdaki
 * `require(require.main.filename)` çalışır ve Discord normal şekilde açılır.
 */
try {
    // Modüller burada import ediliyor: üst seviye import'lar patlarsa
    // try/catch'e hiç girmeden dosya ölür.
    const { disableBackgroundThrottling, patchBrowserWindow } = require("./browserWindow");
    const { registerIpc } = require("./ipc");
    const { initPersistAfterUpdate } = require("./persistAfterUpdate");
    const { getMainSettings } = require("./settings");
    const { initUpdateApplier } = require("./updater");

    // Discord kendi `disable-features` listesini sonradan set ediyor;
    // monkey-patch'in ondan önce kurulmuş olması gerekiyor (plan §3.4).
    disableBackgroundThrottling();

    // DevTools (plan §3.5) — `appSettings` global'i henüz tanımlı değil,
    // tanımlandığı anda yakalıyoruz.
    if (getMainSettings().enableDevTools) {
        onceDefined(global as any, "appSettings", (settings: any) => {
            settings.set("DANGEROUS_ENABLE_DEVTOOLS_ONLY_ENABLE_IF_YOU_KNOW_WHAT_YOURE_DOING", true);
        });
    }

    patchBrowserWindow();
    initPersistAfterUpdate();
    initUpdateApplier();
    registerIpc();

    console.log("[MCord] Main process hazır.");
} catch (err) {
    console.error(
        "[MCord] Kurulum başarısız — Discord modsuz açılacak.\n"
        + "Sorunu bildirmek için: https://github.com/Mavrom/MCord/issues\n",
        err
    );
}

// Orijinal Discord'u başlat. Yukarıda ne olursa olsun bu satır çalışır.
require(require.main!.filename);
