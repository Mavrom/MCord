/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { definePluginSettings, Settings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { Logger } from "../../utils/logger";
import { definePlugin, OptionType, StartAt } from "../../utils/types";
import { byKeys } from "../../webpack/filters";
import { reportFinder, waitFor } from "../../webpack/lazy";
import { parseHidden } from "./parse";

/** Modul kapsaminda kayit: plugin kapaliyken de CI dogruluyor. */
const SETTINGS_SECTIONS = reportFinder(byKeys(["useDefaultUserSettingsSections"]));
const SETTINGS_ACTIONS = reportFinder(byKeys(["open", "setSection", "saveAccountChanges"]));

const logger = new Logger("BetterSettings", "#a6d189");

const settings = definePluginSettings({
    disableFade: {
        type: OptionType.BOOLEAN,
        description: "Ayarlar açılırken solma animasyonunu kapat",
        default: true,
        restartNeeded: false
    },
    rememberLastSection: {
        type: OptionType.BOOLEAN,
        description: "Ayarları en son açtığın bölümde aç",
        default: true
    },
    hiddenSections: {
        type: OptionType.STRING,
        description: "Gizlenecek bölüm kimlikleri (virgülle ayrılmış). Örn: nitro,billing",
        default: ""
    }
});

/**
 * Plugin'in yönettiği stil — kullanıcı CSS'i değil (plan §0.2, `api/styles.ts`).
 * Derleme zamanında bilinen, sabit bir parça.
 */
const FADE_CSS = `
[class*="layer_"] { animation-duration: 0ms !important; transition-duration: 0ms !important; }
[class*="animating_"] { animation: none !important; }
`.trim();

export default definePlugin({
    name: "BetterSettings",
    description: "Discord'un ayarlar menüsünü sadeleştirir: bölüm gizleme, son bölümü hatırlama, animasyon kapatma",
    authors: [Devs.MCord],
    tags: ["ui", "ayarlar"],
    settings,

    // `managedStyle` ve fonksiyon patch'i — kod patch'i yok (plan §5.1).
    requiresRestart: false,
    startAt: StartAt.DOMContentLoaded,

    get managedStyle() {
        return settings.store.disableFade ? FADE_CSS : "";
    },

    cancels: [] as Array<() => void>,

    start() {
        this.hideSections();
        if (settings.store.rememberLastSection) this.rememberSection();
    },

    stop() {
        for (const cancel of this.cancels) cancel();
        this.cancels = [];
    },

    /**
     * İstenmeyen bölümler ayar listesinden çıkarılır.
     *
     * `waitFor` kullanıyoruz: eski eager `findByKeys`, ayar modülü `start()`
     * anında (DOMContentLoaded) henüz yüklenmediği için hep `null` dönüyor ve
     * "modül bulunamadı" uyarısı basıyordu. `waitFor` hem yüklenmeyi bekliyor
     * hem de CI reporter'a kaydoluyor.
     */
    hideSections() {
        const hidden = parseHidden(settings.store.hiddenSections);
        if (hidden.size === 0) return;

        this.cancels.push(waitFor(SETTINGS_SECTIONS, (SectionsModule: any) => {
            if (typeof SectionsModule?.useDefaultUserSettingsSections !== "function") return;

            this.patcher.after(SectionsModule, "useDefaultUserSettingsSections", (_self, _args, returnValue) => {
                if (!Array.isArray(returnValue)) return returnValue;
                return returnValue.filter((entry: any) =>
                    typeof entry?.section !== "string" || !hidden.has(entry.section.toLowerCase()));
            });
        }, { silent: true }));
    },

    /** Ayarlar kapanırken açık olan bölüm kaydedilir, bir dahakine oradan açılır. */
    rememberSection() {
        this.cancels.push(waitFor(SETTINGS_ACTIONS, (SettingsActions: any) => {
            if (typeof SettingsActions?.setSection !== "function") {
                logger.warn("Ayar bölümü eylemleri bulunamadı, hatırlama atlandı.");
                return;
            }

            this.patcher.after(SettingsActions, "setSection", (_self, args) => {
                const section = args[0];
                if (typeof section === "string") {
                    (Settings.plugins.BetterSettings ??= {}).lastSection = section;
                }
            });

            if (typeof SettingsActions.open === "function") {
                this.patcher.before(SettingsActions, "open", (_self, args) => {
                    const last = Settings.plugins.BetterSettings?.lastSection;
                    if (args[0] == null && typeof last === "string") args[0] = last;
                });
            }
        }, { silent: true }));
    }
});
