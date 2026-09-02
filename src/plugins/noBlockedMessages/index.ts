/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { Logger } from "../../utils/logger";
import { definePlugin, StartAt } from "../../utils/types";
import { findByKeys, findStore } from "../../webpack/finder";

const logger = new Logger("NoBlockedMessages", "#a6d189");

/**
 * SCAFFOLD — Vencord'daki aynı adlı plugin'in davranışının MCord API'siyle
 * yeniden yazımı. Kullanılan webpack aramaları ve patch noktaları canlı
 * Discord'da doğrulanmalı; Discord modülü yeniden adlandırdıysa `start`
 * sessizce uyarı basar ve plugin no-op olur (güvenli mod ilkesi).
 */
export default definePlugin({
    name: "NoBlockedMessages",
    description: "Engellenen kullanıcıların mesajlarını ('X engellenmiş mesaj' dahil) tamamen gizler",
    authors: [Devs.Berk],
    tags: ["gizlilik"],
    startAt: StartAt.WebpackReady,
    requiresRestart: false,

    start() {
        try {
            const RelationshipStore = findByKeys("isBlocked", "getRelationships");
            if (!RelationshipStore) return logger.warn("RelationshipStore yok.");
            const MessageStore = findStore("MessageStore");
            if (MessageStore?.getMessages) {
                this.patcher.after(MessageStore, "getMessages", (_s: any, _a: any, res: any) => {
                    try {
                        if (res?._array) res._array = res._array.filter((m: any) => !RelationshipStore.isBlocked?.(m?.author?.id));
                    } catch { /* şekil değişmiş */ }
                    return res;
                });
            }
        } catch (err) {
            logger.error("Başlatılamadı:", err);
        }
    }
});
