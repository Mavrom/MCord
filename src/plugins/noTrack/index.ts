/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { Logger } from "../../utils/logger";
import { definePlugin, OptionType, StartAt } from "../../utils/types";
import { byKeys } from "../../webpack/filters";
import { find, findByKeys } from "../../webpack/finder";

const logger = new Logger("NoTrack", "#a6d189");

const settings = definePluginSettings({
    blockAnalytics: {
        type: OptionType.BOOLEAN,
        description: "Discord'un analitik (track) çağrılarını engelle",
        default: true
    },
    blockSentry: {
        type: OptionType.BOOLEAN,
        description: "Sentry hata raporlamasını engelle",
        default: true
    },
    blockScienceEvents: {
        type: OptionType.BOOLEAN,
        description: "Kullanım ölçüm (science) olaylarını engelle",
        default: true
    }
});

/**
 * Discord'un kendi telemetrisini varsayılan olarak engelliyoruz — ürün
 * duruşunun bir parçası (plan §0.3, §13).
 */
export default definePlugin({
    name: "NoTrack",
    description: "Discord'un telemetri, analitik ve hata raporlama çağrılarını engeller",
    authors: [Devs.MCord],
    tags: ["gizlilik"],
    settings,

    enabledByDefault: true,
    requiresRestart: false,
    startAt: StartAt.WebpackReady,

    blocked: 0,

    start() {
        if (settings.store.blockAnalytics) this.blockAnalytics();
        if (settings.store.blockScienceEvents) this.blockScience();
        if (settings.store.blockSentry) this.blockSentry();
    },

    stop() {
        logger.info(`Oturumda ${this.blocked} telemetri çağrısı engellendi.`);
    },

    count() {
        this.blocked++;
    },

    blockAnalytics() {
        const AnalyticsActions = findByKeys("track", "trackWithMetadata")
            ?? findByKeys("AnalyticsActionHandlers");

        if (!AnalyticsActions) {
            logger.warn("Analitik modülü bulunamadı.");
            return;
        }

        for (const method of ["track", "trackWithMetadata"]) {
            if (typeof AnalyticsActions[method] !== "function") continue;
            this.patcher.instead(AnalyticsActions, method, () => {
                this.count();
                return undefined;
            });
        }
    },

    blockScience() {
        const ScienceModule = find(byKeys(["submitLiveEvent"]), { silent: true })
            ?? findByKeys("encodeProperties", "track");

        if (!ScienceModule) {
            logger.warn("Science modülü bulunamadı.");
            return;
        }

        for (const method of ["submitLiveEvent", "track"]) {
            if (typeof ScienceModule[method] !== "function") continue;
            this.patcher.instead(ScienceModule, method, () => {
                this.count();
                return undefined;
            });
        }
    },

    blockSentry() {
        const sentry = (window as any).__SENTRY__;

        // Sentry ayrı bir webpack instance'ında yaşıyor ve zaten yakalama
        // aşamasında kara listede (plan §4.1); burada sadece global hub'ı
        // etkisizleştiriyoruz.
        if (sentry?.hub?.getClient) {
            try {
                const client = sentry.hub.getClient();
                if (client?.getOptions) client.getOptions().enabled = false;
                sentry.hub.getScope?.()?.clear?.();
                logger.info("Sentry devre dışı bırakıldı.");
            } catch (err) {
                logger.warn("Sentry devre dışı bırakılamadı:\n", err);
            }
        }

        const console = (window as any).DiscordSentry;
        if (console?.close) {
            try {
                console.close();
            } catch { /* zaten kapalı */ }
        }
    }
});
