/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { mountNotificationHost, unmountNotificationHost } from "../../../components/NotificationHost";
import { closeSettingsOverlay, isSettingsOverlayOpen, openSettingsOverlay } from "../../../components/SettingsOverlay";
import { SettingsRoot, type TabId, TABS } from "../../../components/SettingsRoot";
import { Devs } from "../../../utils/constants";
import { Logger } from "../../../utils/logger";
import { definePlugin, StartAt } from "../../../utils/types";
import { byKeys } from "../../../webpack/filters";
import { findLazy } from "../../../webpack/lazy";

const logger = new Logger("Settings", "#f4b8e4");

const SECTION_KEY = "mcord_section";

/**
 * Discord'un ayar menüsü düzen türleri.
 *
 * Eski `getUserSettingsSections` API'si kaldırıldı; menü artık bir
 * `buildLayout()` ağacı üretiyor. Discord Canary 1150'de tür değerleri
 * string'den ("SECTION") sayıya (1) döndü — tanınmayan bir `type` ile düğüm
 * oluşturmak ayar menüsünü komple çökertiyor. Bu yüzden webpack'ten çözemezsek
 * referans katalog sabit sayısal haritasına düşüyoruz, asla ham string'e değil.
 */
const FALLBACK_LAYOUT_TYPES = {
    SECTION: 1,
    SIDEBAR_ITEM: 2,
    PANEL: 3,
    CATEGORY: 5,
    CUSTOM: 19
} as const;

const LayoutTypes = findLazy<Record<string, unknown>>(
    byKeys(["SECTION", "SIDEBAR_ITEM", "PANEL", "CUSTOM"])
);

function layoutType(name: keyof typeof FALLBACK_LAYOUT_TYPES): unknown {
    try {
        const resolved = (LayoutTypes as any)?.[name];
        if (typeof resolved === "number" || typeof resolved === "string") return resolved;
    } catch { /* yedeğe düş */ }
    return FALLBACK_LAYOUT_TYPES[name];
}

/**
 * Her sekme için sabit bir bileşen referansı — `buildLayout()` her ayar
 * açılışında çağrıldığı için burada arrow function üretirsek Discord her seferinde
 * yeni bir bileşen türü görüp tüm ağacı yeniden mount eder.
 */
const TAB_COMPONENTS = new Map(
    TABS.map(tab => {
        const Component = () => <SettingsRoot initialTab={tab.id} />;
        Component.displayName = `McordSettings(${tab.id})`;
        return [tab.id, Component];
    })
);

/** Bir MCord sekmesini Discord'un kenar çubuğu girdisine çevirir. */
function buildEntry(tab: (typeof TABS)[number]) {
    const key = `mcord_${tab.id}`;

    return {
        key,
        type: layoutType("SIDEBAR_ITEM"),
        useTitle: () => tab.label,
        buildLayout: () => [{
            key: `${key}_panel`,
            type: layoutType("PANEL"),
            useTitle: () => tab.label,
            buildLayout: () => [{
                key: `${key}_category`,
                type: layoutType("CATEGORY"),
                buildLayout: () => [{
                    key: `${key}_custom`,
                    type: layoutType("CUSTOM"),
                    Component: TAB_COMPONENTS.get(tab.id),
                    useSearchTerms: () => [tab.label, "MCord"]
                }]
            }]
        }]
    };
}

export default definePlugin({
    name: "Settings",
    description: "MCord ayar arayüzünü açar (Discord ayar sekmesi, toolbar butonu, kısayol)",
    authors: [Devs.MCord],
    required: true,
    startAt: StartAt.DOMContentLoaded,

    patches: [
        {
            find: ".buildLayout().map",
            reason:
                "Discord ayar menüsü artık `getUserSettingsSections` yerine bir "
                + "`buildLayout()` ağacı üretiyor; eski anahtar aramaları hiç "
                + "eşleşmiyordu. Kök düzen kurucusunu sarmalayıp kendi bölümümüzü "
                + "diziye ekliyoruz. Çapa `.buildLayout().map` — bundle'da tek geçiyor.",
            replacement: {
                match: /(\i)\.buildLayout\(\)(?=\.map)/,
                replace: "$self.buildLayout($1)"
            }
        }
    ],

    start() {
        mountNotificationHost();
        this.registerHotkey();
    },

    stop() {
        unmountNotificationHost();
        closeSettingsOverlay();
        document.removeEventListener("keydown", this.onKeyDown, true);
    },

    /**
     * Discord'un kök ayar düzenine MCord bölümünü ekler.
     *
     * Patch'lenmiş kod her ayar açılışında çağırıyor — burada ne olursa olsun
     * orijinal düzeni döndürmek zorundayız, yoksa Discord'un ayarları komple
     * açılmaz.
     */
    buildLayout(builder: { key?: string; buildLayout(): any[] }) {
        let layout: any[];
        try {
            layout = builder.buildLayout();
        } catch (err) {
            logger.error("Discord'un buildLayout'u patladı:\n", err);
            throw err;
        }

        // `.buildLayout().map` bundle'da iç içe kurucularda da geçiyor; MCord
        // bölümünü yalnızca kök menü ağacına ekliyoruz. Yanlış kurucuya düğüm
        // enjekte etmek ayar menüsünü çökertiyordu (referans katalog de bu kontrolü yapar).
        if (builder.key !== "$Root") return layout;

        try {
            if (!Array.isArray(layout)) return layout;
            if (layout.some(node => node?.key === SECTION_KEY)) return layout;

            const section = {
                key: SECTION_KEY,
                type: layoutType("SECTION"),
                useTitle: () => "MCord",
                buildLayout: () => TABS.map(buildEntry)
            };

            // Nitro (faturalandırma) bölümünün üstü referans katalog da tercih ettiği
            // yer; bulunamazsa listenin başlarına koyuyoruz.
            let index = layout.findIndex(node => node?.key === "billing_section");
            if (index === -1) index = Math.min(2, layout.length);

            layout.splice(index, 0, section);
            logger.info("MCord bölümü Discord ayar menüsüne eklendi.");
        } catch (err) {
            logger.error("MCord bölümü eklenemedi (Discord ayarları etkilenmedi):\n", err);
        }

        return layout;
    },

    /** Ayar sekmesi patch'i tutmasa bile ayarlara ulaşılabilsin. */
    registerHotkey() {
        document.addEventListener("keydown", this.onKeyDown, true);
    },

    onKeyDown(event: KeyboardEvent) {
        if (!event.ctrlKey || !event.altKey || event.key.toLowerCase() !== "m") return;

        event.preventDefault();
        event.stopPropagation();
        toggleSettings();
    },

    openSettings: openSettingsOverlay,
    openSettingsModal: openSettingsOverlay
});

/** Açıksa kapat, kapalıysa aç — kısayol ve toolbar butonu bunu kullanıyor. */
export function toggleSettings(initialTab: TabId = "plugins"): void {
    if (isSettingsOverlayOpen()) {
        closeSettingsOverlay();
    } else {
        openSettingsOverlay(initialTab);
    }
}

/** Geriye dönük uyumluluk — eski çağıranlar (updater vb.) için. */
export function openSettingsModal(initialTab: TabId = "plugins"): void {
    openSettingsOverlay(initialTab);
}
