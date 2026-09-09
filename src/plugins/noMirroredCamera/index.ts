/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { Logger } from "../../utils/logger";
import { definePlugin, StartAt } from "../../utils/types";
import { byKeys } from "../../webpack/filters";
import { waitFor } from "../../webpack/lazy";

const logger = new Logger("NoMirroredCamera", "#a6d189");

/**
 * SCAFFOLD — bilinen bir istemci modundaki aynı işlevin MCord API'siyle
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

    cancel: undefined as (() => void) | undefined,

    start() {
        this.cancel = waitFor(byKeys(["getVideoDeviceId", "mirror"]), (Video: any) => {
            try {
                if (Video != null && "mirror" in Video) Video.mirror = false;
            } catch {
                logger.warn("Kamera aynasi kapatilamadi (salt okunur).");
            }
        });
    },

    stop() {
        this.cancel?.();
        this.cancel = undefined;
    }
});
