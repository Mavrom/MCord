/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { mountNotificationHost, unmountNotificationHost } from "../../../components/NotificationHost";
import { SettingsRoot, type TabId,TABS } from "../../../components/SettingsRoot";
import { Devs } from "../../../utils/constants";
import { Logger } from "../../../utils/logger";
import { definePlugin, StartAt } from "../../../utils/types";
import { byKeys } from "../../../webpack/filters";
import { find, findByKeys } from "../../../webpack/finder";

const logger = new Logger("Settings", "#f4b8e4");

/** Discord'un ayarlar menüsündeki bölüm kimliklerimiz. */
const SECTION_PREFIX = "mcord-";

export default definePlugin({
    name: "Settings",
    description: "MCord ayar arayüzünü Discord'un ayarlar menüsüne ekler",
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
        document.removeEventListener("keydown", this.onKeyDown, true);
    },

    /**
     * Discord'un ayar bölümü listesine sekmelerimizi ekliyoruz.
     *
     * Kod patch'i değil fonksiyon patch'i: bölüm listesini üreten fonksiyon
     * webpack'ten bulunabiliyor, dolayısıyla `eval`'e gerek yok (plan §5.1).
     * Bulunamazsa kısayol ve modal yedeği devrede kalır.
     */
    injectSettingsSections() {
        const SectionsModule = findByKeys("useDefaultUserSettingsSections")
            ?? findByKeys("getUserSettingsSections");

        if (!SectionsModule) {
            logger.warn(
                "Discord'un ayar bölümü modülü bulunamadı — sekme enjeksiyonu atlandı. "
                + "Ayarlara Ctrl+Alt+M ile ulaşabilirsin."
            );
            return;
        }

        const methodName = typeof SectionsModule.useDefaultUserSettingsSections === "function"
            ? "useDefaultUserSettingsSections"
            : "getUserSettingsSections";

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
        openSettingsModal();
    },

    openSettingsModal
});

/** Ayarları bağımsız bir modalda açar. */
export function openSettingsModal(initialTab: TabId = "plugins"): void {
    const ModalActions = find(byKeys(["openModal", "closeModal"]), { silent: true });

    if (!ModalActions?.openModal) {
        logger.error("Discord'un modal sistemi bulunamadı, ayarlar açılamıyor.");
        return;
    }

    ModalActions.openModal((props: any) => (
        <div
            style={{
                background: "var(--background-primary, #313338)",
                borderRadius: "8px",
                maxHeight: "80vh",
                width: "min(920px, 90vw)",
                overflow: "auto"
            }}
            {...props}
        >
            <SettingsRoot initialTab={initialTab} />
        </div>
    ));
}
