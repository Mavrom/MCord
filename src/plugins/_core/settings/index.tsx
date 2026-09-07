/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { mountNotificationHost, unmountNotificationHost } from "../../../components/NotificationHost";
import { closeSettingsOverlay, isSettingsOverlayOpen, openSettingsOverlay } from "../../../components/SettingsOverlay";
import { type TabId } from "../../../components/SettingsRoot";
import { injectStyles } from "../../../components/styles";
import { Devs } from "../../../utils/constants";
import { definePlugin, StartAt } from "../../../utils/types";

/**
 * MCord ayarları **kendi React kökümüzdeki overlay** ile açılıyor: toolbar'daki
 * MC butonu veya `Ctrl+Alt+M`.
 *
 * Discord'un kendi ayar menüsüne sekme enjekte etme denendi (`buildLayout()`
 * patch'i) ama Discord'un güncel sürümünde ayar menüsünü komple çökertiyordu —
 * o yol kapatıldı. Overlay Discord'un webpack/menü değişikliklerinden bağımsız.
 */
export default definePlugin({
    name: "Settings",
    description: "MCord ayar arayüzünü açar (toolbar butonu + Ctrl+Alt+M)",
    authors: [Devs.MCord],
    required: true,
    startAt: StartAt.DOMContentLoaded,

    start() {
        // MCord CSS'i (ipucu balonu dahil) baştan enjekte et — ayar penceresi
        // hiç açılmasa bile mesaj/üye listesi dekorasyonları kullanıyor.
        injectStyles();
        mountNotificationHost();
        document.addEventListener("keydown", this.onKeyDown, true);
    },

    stop() {
        unmountNotificationHost();
        closeSettingsOverlay();
        document.removeEventListener("keydown", this.onKeyDown, true);
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
