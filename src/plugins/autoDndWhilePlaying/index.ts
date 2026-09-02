/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { definePluginSettings } from "../../api/settings";
import { getUserSettingLazy } from "../../api/userSettings";
import { Devs } from "../../utils/constants";
import { Logger } from "../../utils/logger";
import { definePlugin, OptionType } from "../../utils/types";

const logger = new Logger("AutoDNDWhilePlaying", "#f4b8e4");
const statusSetting = getUserSettingLazy<string>("status", "status");
let savedStatus: string | null = null;

const settings = definePluginSettings({
    statusToSet: {
        type: OptionType.SELECT,
        description: "Oyun çalışırken kullanılacak durum",
        options: [
            { label: "Çevrimiçi", value: "online" },
            { label: "Boşta", value: "idle" },
            { label: "Rahatsız Etmeyin", value: "dnd", default: true },
            { label: "Görünmez", value: "invisible" }
        ]
    }
});

async function updateStatus(value: string): Promise<void> {
    if (typeof statusSetting?.updateSetting !== "function") {
        logger.warn("Discord durum ayarı bulunamadı; durum değiştirilmedi.");
        return;
    }
    await statusSetting.updateSetting(value);
}

export default definePlugin({
    name: "AutoDNDWhilePlaying",
    description: "Oyun açıldığında seçilen çevrimiçi duruma geçer, oyun kapanınca önceki durumu geri yükler",
    authors: [Devs.Berk],
    tags: ["aktivite", "durum"],
    dependencies: ["UserSettingsAPI"],
    settings,

    flux: {
        async RUNNING_GAMES_CHANGE(event: any) {
            const current = statusSetting?.getSetting?.();
            if (typeof current !== "string") return;
            if ((event?.games?.length ?? 0) > 0) {
                if (current !== settings.store.statusToSet && current !== "invisible") {
                    savedStatus = current;
                    await updateStatus(settings.store.statusToSet);
                }
            } else if (savedStatus) {
                const restore = savedStatus;
                savedStatus = null;
                await updateStatus(restore);
            }
        }
    },

    async stop() {
        if (savedStatus) await updateStatus(savedStatus);
        savedStatus = null;
    }
});
