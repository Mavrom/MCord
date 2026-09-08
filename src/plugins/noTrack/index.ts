/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { Logger } from "../../utils/logger";
import { definePlugin, OptionType, StartAt } from "../../utils/types";
import { Flux, getFluxDispatcher } from "../../webpack/common";

const logger = new Logger("NoTrack", "#a6d189");

const settings = definePluginSettings({
    blockAnalytics: {
        type: OptionType.BOOLEAN,
        description: "Discord'un analitik (track) çağrılarını engelle",
        default: true,
        restartNeeded: true
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

    /**
     * Analitik: `track`/`trackWithMetadata` finder'ı bu build'de kırık.
     * Bilinen yöntem — `AnalyticsActionHandlers.handle` modülünde
     * store yapıcısını kendi stub'ımızla değiştir.
     */
    patches: [
        {
            find: "AnalyticsActionHandlers.handle",
            predicate: () => settings.store.blockAnalytics,
            reason: "Discord analitiğini kapat — track finder'ı kırık, store yapıcısını değiştir.",
            replacement: {
                match: /\(0,\i\.analyticsTrackingStoreMaker\)/,
                replace: "$self.analyticsTrackingStoreMaker"
            }
        },
        {
            // Science / metrics: `submitLiveEvent` finder'ı bu build'de kırık —
            // Bilinen yöntem, METRICS_V2 modülünde interval'i ve
            // increment/distribution çağrılarını etkisizleştir.
            find: ".METRICS_V2",
            predicate: () => settings.store.blockScienceEvents,
            reason: "Discord metrics/science telemetrisini kapat — finder yerine kod patch'i",
            replacement: [
                {
                    match: /this\._intervalId=/,
                    replace: "this._intervalId=void 0&&"
                },
                {
                    match: /(?:increment|distribution)\(\i(?:,\i)?\)\{/g,
                    replace: "$&return;"
                }
            ]
        }
    ],

    // Discord bazı yerlerde TRACK olayının `resolve` callback'ini bekliyor
    // (ör. sesli hata ayıklama toggle'ı). Handler'ı NOOP'ladığımız için
    // kendimiz çözüyoruz.
    flux: {
        TRACK(event: any) {
            event?.resolve?.();
        }
    },

    blocked: 0,

    start() {
        // Analitik + science kod patch'leriyle hallediliyor; burada sadece Sentry.
        if (settings.store.blockSentry) this.blockSentry();
    },

    stop() {
        logger.info(`Oturumda ${this.blocked} telemetri çağrısı engellendi.`);
    },

    count() {
        this.blocked++;
    },

    analyticsTrackingStoreMaker() {
        const StoreBase = (Flux as any)?.Store;
        if (typeof StoreBase !== "function") {
            logger.warn("Flux.Store bulunamadı — analitik stub'ı kurulamadı.");
            return {};
        }

        const self = this;
        class AnalyticsTrackingStoreStub extends StoreBase {
            static displayName = "AnalyticsTrackingStore";
            requestDrain() { self.count(); }
            async submitEventsImmediately() {
                self.count();
                throw {
                    ok: false,
                    status: 500,
                    body: { message: "Analytics tracking is disabled by NoTrack", code: 0 },
                    headers: {},
                    text: JSON.stringify({ message: "Analytics tracking is disabled by NoTrack", code: 0 })
                };
            }
        }

        return new (AnalyticsTrackingStoreStub as any)(getFluxDispatcher());
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

        const discordSentry = (window as any).DiscordSentry;
        if (discordSentry?.close) {
            try {
                discordSentry.close();
            } catch { /* zaten kapalı */ }
        }
    }
});
