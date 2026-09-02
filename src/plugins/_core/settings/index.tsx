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
 * `buildLayout()` ağacı üretiyor. Enum'u webpack'ten çözüyoruz, bulunamazsa
 * string karşılıklarına düşüyoruz (değerler bugüne kadar string olageldi).
 */
const LayoutTypes = findLazy<Record<string, unknown>>(
    byKeys(["SECTION", "SIDEBAR_ITEM", "PANEL"])
);

function layoutType(name: string): unknown {
    try {
        return (LayoutTypes as any)?.[name] ?? name;
    } catch {
        return name;
    }
}

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
                    Component: () => <SettingsRoot initialTab={tab.id} />,
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
    buildLayout(builder: { buildLayout(): any[] }) {
        let layout: any[];
        try {
            layout = builder.buildLayout();
        } catch (err) {
            logger.error("Discord'un buildLayout'u patladı:\n", err);
            throw err;
        }

        try {
            if (!Array.isArray(layout)) return layout;
            if (layout.some(node => node?.key === SECTION_KEY)) return layout;

            const section = {
                key: SECTION_KEY,
                type: layoutType("SECTION"),
                useTitle: () => "MCord",
                buildLayout: () => TABS.map(buildEntry)
            };

            // Nitro bölümünün üstü referans katalog da tercih ettiği yer; bulunamazsa
            // listenin başlarına koyuyoruz.
            let index = layout.findIndex(node => typeof node?.key === "string" && node.key.includes("nitro"));
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
