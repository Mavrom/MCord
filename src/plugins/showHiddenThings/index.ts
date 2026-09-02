/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { Logger } from "../../utils/logger";
import { definePlugin, StartAt } from "../../utils/types";
import { findByKeys } from "../../webpack/finder";

const logger = new Logger("ShowHiddenThings", "#a6d189");

/**
 * SCAFFOLD — referans katalog aynı adlı plugin'in davranışının MCord API'siyle
 * yeniden yazımı. Kullanılan webpack aramaları ve patch noktaları canlı
 * Discord'da doğrulanmalı; Discord modülü yeniden adlandırdıysa `start`
 * sessizce uyarı basar ve plugin no-op olur (güvenli mod ilkesi).
 */
export default definePlugin({
    name: "ShowHiddenThings",
    description: "Gizli mod menülerini, staff bayraklarını ve deneysel özellik geçişlerini görünür kılar",
    authors: [Devs.Berk],
    tags: ["gelistirici"],
    startAt: StartAt.WebpackReady,
    requiresRestart: false,

    start() {
        try {
            const DevMode = findByKeys("isDeveloper") ?? findByKeys("hasFlag", "STAFF");
            if (DevMode && "isDeveloper" in DevMode) {
                try { Object.defineProperty(DevMode, "isDeveloper", { get: () => true, configurable: true }); } catch { /* tanımlanamaz */ }
            }
        } catch (err) {
            logger.error("Başlatılamadı:", err);
        }
    }
});
