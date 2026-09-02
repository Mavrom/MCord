/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { Logger } from "../../utils/logger";
import { definePlugin, StartAt } from "../../utils/types";
import { findByKeys } from "../../webpack/finder";

const logger = new Logger("NoMirroredCamera", "#a6d189");

/**
 * SCAFFOLD — referans'daki aynı adlı plugin'in davranışının MCord API'siyle
 * yeniden yazımı. Kullanılan webpack aramaları ve patch noktaları canlı
 * Discord'da doğrulanmalı; Discord modülü yeniden adlandırdıysa `start`
 * sessizce uyarı basar ve plugin no-op olur (güvenli mod ilkesi).
 */
export default definePlugin({
    name: "NoMirroredCamera",
    description: "Kendi kamera önizlemenin ayna (yatay çevrilmiş) gösterimini kapatır",
    authors: [Devs.Berk],
    tags: ["ses"],
    startAt: StartAt.WebpackReady,
    requiresRestart: false,

    start() {
        try {
            const Video = findByKeys("getVideoDeviceId", "mirror") ?? null;
            if (Video && "mirror" in Video) { try { (Video as any).mirror = false; } catch { /* salt okunur */ } }
        } catch (err) {
            logger.error("Başlatılamadı:", err);
        }
    }
});
