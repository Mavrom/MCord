/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { Logger } from "../../utils/logger";
import { definePlugin } from "../../utils/types";
import { byKeys } from "../../webpack/filters";
import { find } from "../../webpack/finder";

const logger = new Logger("DontRoundMyTimestamps", "#a6d189");
let previousRounding: ((value: number) => number) | undefined;

export default definePlugin({
    name: "DontRoundMyTimestamps",
    description: "Göreli zamanları en yakın sayıya değil aşağı doğru yuvarlar",
    authors: [Devs.Berk],
    tags: ["görünüm", "zaman"],
    requiresRestart: false,

    start() {
        const moment = find<any>(byKeys(["relativeTimeRounding"]), { silent: true });
        if (typeof moment?.relativeTimeRounding !== "function") {
            logger.warn("Göreli zaman modülü bulunamadı; değişiklik uygulanmadı.");
            return;
        }

        previousRounding = moment.relativeTimeRounding();
        moment.relativeTimeRounding(Math.floor);
        this.moment = moment;
    },

    stop() {
        if (previousRounding && typeof this.moment?.relativeTimeRounding === "function") {
            this.moment.relativeTimeRounding(previousRounding);
        }
        previousRounding = undefined;
        this.moment = undefined;
    },

    moment: undefined as any
});
