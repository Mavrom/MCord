/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { Logger } from "../../utils/logger";
import { definePlugin, StartAt } from "../../utils/types";
import { findByKeys } from "../../webpack/finder";

const logger = new Logger("DisableCallIdle", "#a6d189");

/**
 * SCAFFOLD — referans katalog aynı adlı plugin'in davranışının MCord API'siyle
 * yeniden yazımı. Kullanılan webpack aramaları ve patch noktaları canlı
 * Discord'da doğrulanmalı; Discord modülü yeniden adlandırdıysa `start`
 * sessizce uyarı basar ve plugin no-op olur (güvenli mod ilkesi).
 */
export default definePlugin({
    name: "DisableCallIdle",
    description: "Aramada hareketsiz kalınca otomatik atılma/sağırlaştırmayı engeller",
    authors: [Devs.Berk],
    tags: ["ses"],
    startAt: StartAt.WebpackReady,
    requiresRestart: false,

    start() {
        try {
            const IdleStore = findByKeys("getIdleTimeout", "idleSince") ?? findByKeys("AFK_TIMEOUT");
            if (!IdleStore) return logger.warn("Idle modülü bulunamadı.");
            const ActionModule = findByKeys("setAfk", "handleVoiceStateUpdates") ?? findByKeys("setIdle");
            if (ActionModule?.setIdle) this.patcher.instead(ActionModule, "setIdle", () => undefined);
            if (ActionModule?.setAfk) this.patcher.instead(ActionModule, "setAfk", () => undefined);
        } catch (err) {
            logger.error("Başlatılamadı:", err);
        }
    }
});
