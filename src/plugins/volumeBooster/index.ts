/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { Logger } from "../../utils/logger";
import { definePlugin, StartAt } from "../../utils/types";
import { byKeys } from "../../webpack/filters";
import { find } from "../../webpack/finder";

const logger = new Logger("VolumeBooster", "#a6d189");

/**
 * SCAFFOLD — bilinen bir istemci modundaki aynı işlevin MCord API'siyle
 * yeniden yazımı. Kullanılan webpack aramaları ve patch noktaları canlı
 * Discord'da doğrulanmalı; Discord modülü yeniden adlandırdıysa `start`
 * sessizce uyarı basar ve plugin no-op olur (güvenli mod ilkesi).
 */
export default definePlugin({
    name: "VolumeBooster",
    description: "Kullanıcı ses seviyesini %200'e kadar çıkarabilme",
    authors: [Devs.Berk],
    tags: ["ses"],
    startAt: StartAt.WebpackReady,
    requiresRestart: false,

    start() {
        try {
            // Scaffold: Discord modülü yeniden adlandırdıysa sessizce no-op
            // (konsolu kirletmeden). Doğru port kod patch'i gerektiriyor.
            const Volume = find(byKeys(["setLocalVolume", "getLocalVolume"]), { silent: true })
                ?? find(byKeys(["setLocalVolume"]), { silent: true });
            if ((Volume as any)?.setLocalVolume) {
                this.patcher.instead(Volume as any, "setLocalVolume", (self: any, args: any[], orig: any) => {
                    if (typeof args[1] === "number") args[1] = Math.min(args[1] * 2, 200);
                    return orig.apply(self, args);
                });
            }
        } catch (err) {
            logger.error("Başlatılamadı:", err);
        }
    }
});
