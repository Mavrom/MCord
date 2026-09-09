/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { popNotice, showNotice } from "../../api/notices";
import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { definePlugin, OptionType } from "../../utils/types";
import { getFluxDispatcher } from "../../webpack/common";

const settings = definePluginSettings({
    minutes: {
        type: OptionType.SLIDER,
        description: "Boşa geçmeden önce beklenecek dakika (0 = kapalı)",
        markers: [0, 5, 10, 15, 20, 30, 45, 60],
        default: 10,
        restartNeeded: true
    },
    confirmReturn: {
        type: OptionType.BOOLEAN,
        description: "Geri dönünce çevrimiçi olmadan önce onay iste",
        default: true
    }
});

export default definePlugin({
    name: "CustomIdle",
    description: "Discord'un otomatik boşa geçme süresini değiştirir veya kapatır",
    authors: [Devs.Berk],
    tags: ["durum", "özelleştirme"],
    dependencies: ["NoticesAPI"],
    settings,

    patches: [{
        find: 'type:"IDLE",idle:',
        reason: "Idle zaman aşımı ve geri dönüş dispatch'i aynı aktivite izleyici fabrikasında yerel.",
        replacement: [
            {
                match: /(?<=Date\.now\(\)-\i>)\i\.\i\|\|/,
                replace: "$self.timeoutMs()||"
            },
            {
                match: /\i\.\i\.dispatch\(\{type:"IDLE",idle:!1}\)/,
                replace: "$self.returnOnline()"
            }
        ]
    }],

    timeoutMs(): number {
        return settings.store.minutes === 0 ? Infinity : settings.store.minutes * 60_000;
    },

    returnOnline(): void {
        if (!settings.store.confirmReturn) {
            getFluxDispatcher()?.dispatch?.({ type: "IDLE", idle: false });
            return;
        }

        popNotice();
        showNotice(
            "Tekrar çevrimiçi görünmek ister misin?",
            "Çevrimiçi ol",
            () => getFluxDispatcher()?.dispatch?.({ type: "IDLE", idle: false })
        );
    },

    stop() {
        popNotice();
    }
});
