/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { definePluginSettings, Settings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { Logger } from "../../utils/logger";
import { definePlugin, OptionType, StartAt } from "../../utils/types";
import { findByKeys } from "../../webpack/finder";
import { parseHidden } from "./parse";

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

    start() {
        this.hideSections();
        if (settings.store.rememberLastSection) this.rememberSection();
    },

    /** İstenmeyen bölümler ayar listesinden çıkarılır. */
    hideSections() {
        const hidden = parseHidden(settings.store.hiddenSections);
        if (hidden.size === 0) return;

        const SectionsModule = findByKeys("useDefaultUserSettingsSections")
            ?? findByKeys("getUserSettingsSections");

        if (!SectionsModule) {
            logger.warn("Ayar bölümü modülü bulunamadı, gizleme atlandı.");
            return;
        }

        const method = typeof SectionsModule.useDefaultUserSettingsSections === "function"
            ? "useDefaultUserSettingsSections"
            : "getUserSettingsSections";

        this.patcher.after(SectionsModule, method, (_self, _args, returnValue) => {
            if (!Array.isArray(returnValue)) return returnValue;
            return returnValue.filter((entry: any) =>
                typeof entry?.section !== "string" || !hidden.has(entry.section.toLowerCase()));
        });
    },

    /** Ayarlar kapanırken açık olan bölüm kaydedilir, bir dahakine oradan açılır. */
    rememberSection() {
        const SettingsActions = findByKeys("open", "setSection")
            ?? findByKeys("setSection");

        if (!SettingsActions?.setSection) {
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
    }
});
