/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { Logger } from "../../utils/logger";
import { definePlugin, StartAt } from "../../utils/types";
import { findByKeys } from "../../webpack/finder";

const logger = new Logger("NoDefaultHangStatus", "#a6d189");

/**
 * SCAFFOLD — bilinen bir istemci modundaki aynı işlevin MCord API'siyle
 * yeniden yazımı. Kullanılan webpack aramaları ve patch noktaları canlı
 * Discord'da doğrulanmalı; Discord modülü yeniden adlandırdıysa `start`
 * sessizce uyarı basar ve plugin no-op olur (güvenli mod ilkesi).
 */
export default definePlugin({
    name: "NoDefaultHangStatus",
    description: "Yeni 'takılıyor' (hang) durumunun otomatik seçilmesini engeller",
    authors: [Devs.Berk],
    tags: ["gizlilik"],
    startAt: StartAt.WebpackReady,
    requiresRestart: false,

    start() {
        try {
            const HangStatus = findByKeys("setHangStatus", "clearHangStatus") ?? findByKeys("HANG_STATUS");
            if (HangStatus?.setHangStatus) this.patcher.instead(HangStatus, "setHangStatus", () => undefined);
        } catch (err) {
            logger.error("Başlatılamadı:", err);
        }
    }
});
