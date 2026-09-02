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
import { findByKeys, findBySource } from "../../../webpack/finder";

const logger = new Logger("Settings", "#f4b8e4");

/** Discord'un ayarlar menüsündeki bölüm kimliklerimiz. */
const SECTION_PREFIX = "mcord-";

export default definePlugin({
    name: "Settings",
    description: "MCord ayar arayüzünü açar (toolbar butonu, kısayol, Discord ayar sekmesi)",
    authors: [Devs.MCord],
    required: true,
    startAt: StartAt.DOMContentLoaded,

    start() {
        mountNotificationHost();
        this.injectSettingsSections();
        this.registerHotkey();
    },

    stop() {
        unmountNotificationHost();
        closeSettingsOverlay();
        document.removeEventListener("keydown", this.onKeyDown, true);
    },

    /**
     * Discord'un ayar bölümü listesine sekmelerimizi ekliyoruz. Bulunamazsa
     * toolbar butonu + Ctrl+Alt+M yedeği devrede kalır (Canary'de bu yol
     * çoğu sürümde kırık).
     */
    injectSettingsSections() {
        const SectionsModule =
            findByKeys("useDefaultUserSettingsSections")
            ?? findByKeys("getUserSettingsSections")
            ?? findBySource("useDefaultUserSettingsSections")
            ?? findBySource("getUserSettingsSections");

        const methodName = SectionsModule && (
            typeof SectionsModule.useDefaultUserSettingsSections === "function"
                ? "useDefaultUserSettingsSections"
                : typeof SectionsModule.getUserSettingsSections === "function"
                    ? "getUserSettingsSections"
                    : null
        );

        if (!SectionsModule || !methodName) {
            logger.warn(
                "Discord'un ayar bölümü modülü bulunamadı — sekme enjeksiyonu atlandı. "
                + "MCord'a toolbar'daki MC butonu veya Ctrl+Alt+M ile ulaşabilirsin."
            );
            return;
        }

        this.patcher.after(SectionsModule, methodName, (_self, _args, returnValue) => {
            if (!Array.isArray(returnValue)) return returnValue;
            return [...returnValue, ...this.buildSections()];
        });

        logger.info(`Ayar sekmeleri "${methodName}" üzerinden enjekte edildi.`);
    },

    buildSections() {
        return [
            { section: "DIVIDER" },
            { section: "HEADER", label: "MCord" },
            ...TABS.map(tab => ({
                section: `${SECTION_PREFIX}${tab.id}`,
                label: tab.label,
                element: () => <SettingsRoot initialTab={tab.id} />,
                className: `mcord-settings-${tab.id}`
            }))
        ];
    },

    /** Enjeksiyon başarısız olsa bile ayarlara ulaşılabilsin. */
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

/** Geriye dönük uyumluluk — eski çağıranlar (recovery vb.) için. */
export function openSettingsModal(initialTab: TabId = "plugins"): void {
    openSettingsOverlay(initialTab);
}
