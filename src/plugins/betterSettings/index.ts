/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { definePluginSettings, Settings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { Logger } from "../../utils/logger";
import { definePlugin, OptionType, StartAt } from "../../utils/types";
import { bySource } from "../../webpack/filters";
import { find } from "../../webpack/finder";
import { reportFinder } from "../../webpack/lazy";
import { isHiddenKey, parseHidden } from "./parse";

/**
 * Ayar penceresinin gezinme durumu (`currentPanelKey`, zustand benzeri store,
 * `{getField, subscribe, ...}`). Adı yok, mangle edilmiş tek export'ta duruyor;
 * kaynak parçasıyla buluyoruz. Modul kapsaminda kayit: plugin kapaliyken de CI
 * dogruluyor.
 */
const PANEL_STATE = reportFinder(bySource("currentPanelKey:void 0,", "scrollPositionSnapshots:new Map"));

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
        description: "Gizlenecek bölümler (virgülle ayrılmış). Kısa ad ya da tam anahtar: nitro, billing, gift_sidebar_item",
        default: "",
        restartNeeded: true
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

interface PanelStateStore {
    getField(field: string): unknown;
    subscribe(listener: (state: Record<string, unknown>) => void): () => void;
}

function isPanelStateStore(value: any): value is PanelStateStore {
    return typeof value?.getField === "function" && typeof value?.subscribe === "function";
}

export default definePlugin({
    name: "BetterSettings",
    description: "Discord'un ayarlar menüsünü sadeleştirir: bölüm gizleme, son bölümü hatırlama, animasyon kapatma",
    authors: [Devs.MCord],
    tags: ["ui", "ayarlar"],
    settings,
    startAt: StartAt.DOMContentLoaded,

    patches: [
        {
            // Vencord'un Settings plugin'iyle aynı nokta: ayar ağacının her
            // düğümünün çocukları burada `buildLayout()` ile kuruluyor.
            find: ".buildLayout().map",
            reason: "Discord ayar menüsünü düğüm ağacına (`buildLayout`) taşıdı; eski `useDefaultUserSettingsSections` listesi yok. Çocuk düğümler yalnız bu genel kurucuda, export edilmeyen bir iç fonksiyonda üretiliyor.",
            predicate: () => parseHidden(settings.store.hiddenSections).size > 0,
            replacement: {
                match: /(\i)\.buildLayout\(\)(?=\.map)/,
                replace: "$self.buildLayout($1)"
            }
        },
        {
            // `openUserSettings(target)`: hedef verilmezse Discord hesap
            // paneline düşüyor. Hedef yalnız modal render'ında `target` prop'u.
            // Modal anahtarı sabiti (`"USER_SETTINGS_MODAL_MODAL_KEY"`, Discord'un
            // gerçek değeri) ayrı modüle taşındı; açılış dispatch'i burada kaldı.
            find: 'type:"USER_SETTINGS_MODAL_OPEN"',
            reason: "`openUserSettings` ESM getter export'u, çalışma zamanında sarılamıyor; eski `open`/`setSection` modülü bölündü. Açılış hedefi yalnız modal render fonksiyonundaki `target` prop'unda.",
            replacement: {
                match: /(?<=\{\.\.\.\i,target:)\i(?=\}\))/,
                replace: "$self.openTarget($&)"
            }
        }
    ],

    get managedStyle() {
        return settings.store.disableFade ? FADE_CSS : "";
    },

    hidden: new Set<string>(),
    panelState: null as PanelStateStore | null,
    unsubscribePanel: undefined as (() => void) | undefined,

    start() {
        this.hidden = parseHidden(settings.store.hiddenSections);
        // Webpack bu noktada hazır olmayabilir; olmazsa ilk `openTarget`
        // çağrısında (ayarlar açılırken) tekrar deneniyor.
        this.trackPanel();
    },

    stop() {
        this.unsubscribePanel?.();
        this.unsubscribePanel = undefined;
        this.panelState = null;
    },

    /**
     * Ayar ağacından istenmeyen düğümleri çıkarır. Yalnız bölüm ve kenar
     * çubuğu öğeleri; hesap paneline giden yol korunuyor (bkz. `isHiddenKey`).
     * Hatada Discord'un orijinal listesi döner — ayarlar menüsü hiç çökmesin.
     */
    buildLayout(node: { buildLayout(): unknown; }) {
        const layout = node.buildLayout();
        if (!Array.isArray(layout) || this.hidden.size === 0) return layout;

        try {
            return layout.filter((child: any) => !isHiddenKey(child?.key, this.hidden));
        } catch (err) {
            logger.error("Bölüm gizleme başarısız, orijinal liste kullanılıyor:", err);
            return layout;
        }
    },

    /**
     * Modal açılırken hedef bölüm. Discord bir hedef verdiyse ona dokunmuyoruz;
     * verilmediyse en son açık kalan panel. Geçersiz/gizlenmiş bir anahtar
     * gelirse Discord kendisi `account_panel`'e düşüyor.
     */
    openTarget(target: unknown) {
        this.trackPanel();

        if (target != null || !settings.store.rememberLastSection) return target;

        const last = Settings.plugins.BetterSettings?.lastSection;
        return typeof last === "string" && last.length > 0 ? last : target;
    },

    /** Açık paneli store'dan dinleyip kaydeder (yalnız bir kez abone olur). */
    trackPanel() {
        if (this.panelState != null) return;

        let store: PanelStateStore | undefined;
        try {
            const exports = find<Record<string, unknown>>(PANEL_STATE, { silent: true });
            store = exports == null ? undefined : Object.values(exports).find(isPanelStateStore);
        } catch {
            return;
        }
        if (store == null) return;

        this.panelState = store;
        this.unsubscribePanel = store.subscribe(state => {
            const key = state?.currentPanelKey;
            // Modal kapanırken store sıfırlanıyor (`undefined`), onu yok say.
            if (typeof key !== "string" || !settings.store.rememberLastSection) return;

            const pluginSettings = (Settings.plugins.BetterSettings ??= {});
            if (pluginSettings.lastSection !== key) pluginSettings.lastSection = key;
        });
    }
});
