/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { showNotification } from "../../../api/notifications";
import { definePluginSettings } from "../../../api/settings";
import { Devs } from "../../../utils/constants";
import { definePlugin, OptionType, StartAt } from "../../../utils/types";
import { openSettingsModal } from "../settings";
import { checkForUpdates, skipVersion } from "./check";

const settings = definePluginSettings({
    checkOnStartup: {
        type: OptionType.BOOLEAN,
        description: "Açılışta güncellemeleri kontrol et",
        default: true
    },
    checkIntervalHours: {
        type: OptionType.SLIDER,
        description: "Kaç saatte bir kontrol edilsin (0 = sadece açılışta)",
        markers: [0, 1, 6, 12, 24],
        default: 6,
        stickToMarkers: true
    }
});

export default definePlugin({
    name: "Updater",
    description: "Yeni MCord sürümlerini kontrol eder ve changelog'lu bildirim gösterir",
    authors: [Devs.MCord],
    required: true,
    startAt: StartAt.ConnectionOpen,
    settings,

    timer: undefined as ReturnType<typeof setInterval> | undefined,

    async start() {
        if (settings.store.checkOnStartup) await this.check();

        const hours = settings.store.checkIntervalHours;
        if (hours > 0) {
            this.timer = setInterval(() => void this.check(), hours * 60 * 60 * 1000);
        }
    },

    stop() {
        if (this.timer != null) clearInterval(this.timer);
        this.timer = undefined;
    },

    /**
     * Sessizce güncelleme yapmıyoruz — kullanıcı ne değiştiğini görüyor
     * ve üç seçenekten birini veriyor (plan §10.1).
     */
    async check() {
        const state = await checkForUpdates();
        if (!state.available || !state.latest) return;

        const { version, changelog } = state.latest;

        showNotification({
            title: `MCord ${version} yayınlandı`,
            body: firstLines(changelog),
            color: "#a6d189",
            duration: Infinity,
            actions: [
                {
                    label: "Şimdi güncelle",
                    onClick: () => openSettingsModal("updater")
                },
                {
                    label: "Sonra hatırlat",
                    onClick: () => { /* bildirim kapanır, sonraki kontrolde tekrar çıkar */ }
                },
                {
                    label: "Bu sürümü atla",
                    onClick: () => skipVersion(version)
                }
            ]
        });
    }
});

function firstLines(changelog: string, count = 4): string {
    const lines = changelog.split("\n").map(line => line.trim()).filter(Boolean);
    const head = lines.slice(0, count).join("\n");
    return lines.length > count ? `${head}\n…` : head;
}
