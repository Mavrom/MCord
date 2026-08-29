/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { showNotification } from "../../../api/notifications";
import { plugins, setPluginEnabled, stopPlugin } from "../../../api/PluginManager";
import { flushSettings, Settings } from "../../../api/settings";
import { Devs } from "../../../utils/constants";
import { Logger } from "../../../utils/logger";
import { definePlugin, StartAt } from "../../../utils/types";
import { findByPrototypeKeys } from "../../../webpack/finder";
import { attributeCrash } from "./attribution";
import {
    CRASH_LIMIT,
    enterSafeMode,
    getPermanentlyDisabledPlugins,
    recordCrash,
    shouldPermanentlyDisable,
    startCleanSessionTimer,
    stopCleanSessionTimer
} from "./crashLoop";
import { ErrorScreen } from "./ErrorScreen";
import { attemptRecovery } from "./steps";

const logger = new Logger("Recovery", "#e78284");

export default definePlugin({
    name: "Recovery",
    description: "Çökmeleri yakalar, sorumlu plugin'i kapatır ve Discord'u toparlar",
    authors: [Devs.MCord],
    required: true,
    startAt: StartAt.WebpackReady,

    start() {
        // Discord'un `ErrorBoundary` bileşeni. `_handleSubmitReport` prototype
        // üzerinde olduğu için mangle edilmiyor (plan §8.1).
        const ErrorBoundary = findByPrototypeKeys("_handleSubmitReport");

        if (!ErrorBoundary?.prototype) {
            logger.error("Discord'un ErrorBoundary bileşeni bulunamadı — kurtarma devre dışı.");
            return;
        }

        this.patcher.after(ErrorBoundary.prototype, "render", (instance, _args, returnValue) => {
            const { error, info } = instance.state ?? {};
            if (!error) return returnValue;

            return this.renderErrorScreen(instance, error, info?.componentStack ?? "");
        });

        startCleanSessionTimer();
        this.warnAboutDisabledPlugins();
    },

    stop() {
        stopCleanSessionTimer();
    },

    /** Bu çökme için atıf zaten yapıldı mı — her render'da tekrar kapatmayalım. */
    handled: new WeakSet<object>(),

    renderErrorScreen(instance: any, error: Error, componentStack: string) {
        const attribution = attributeCrash(error, componentStack);

        if (!this.handled.has(error)) {
            this.handled.add(error);
            this.handleCrash(attribution.plugins, error);
        }

        return (
            <ErrorScreen
                error={error}
                componentStack={componentStack}
                attribution={attribution}
                onRecover={() => {
                    if (attemptRecovery()) {
                        // Hepsi başarılıysa hata ekranı kapanır ve Discord
                        // kaldığı yerden devam eder (plan §8.3).
                        instance.setState({ info: null, error: null });
                    }
                }}
                onSafeMode={() => {
                    enterSafeMode("Kullanıcı güvenli modu seçti.");
                    flushSettings();
                    void window.McordNative.app.relaunch();
                }}
            />
        );
    },

    /** Suçlu plugin devre dışı bırakılıp kalıcı bildirim gösteriliyor (plan §8.4). */
    handleCrash(culprits: string[], error: Error) {
        if (culprits.length === 0) {
            logger.error("Çökme atfedilemedi:\n", error);
            return;
        }

        for (const name of culprits) {
            const plugin = plugins[name];
            if (!plugin || plugin.required) continue;

            const count = recordCrash(name);
            void stopPlugin(plugin);

            const permanent = shouldPermanentlyDisable(name);
            if (permanent) setPluginEnabled(name, false);

            flushSettings();

            showNotification({
                title: permanent
                    ? `${name} kalıcı olarak kapatıldı`
                    : `${name} devre dışı bırakıldı`,
                body: permanent
                    ? `Art arda ${CRASH_LIMIT} kez çöktürdü. Ayarlardan tekrar açabilirsin.`
                    : `Çökmeye yol açtı (${count}/${CRASH_LIMIT}).`,
                color: "#e78284",
                // Kullanıcı kapatana kadar durur (plan §8.4).
                duration: Infinity,
                actions: IS_DEV
                    ? [{
                        label: "Yeniden Etkinleştir",
                        onClick: () => {
                            setPluginEnabled(name, true);
                            delete Settings.crashCount[name];
                        }
                    }]
                    : undefined
            });
        }
    },

    /** Önceki oturumda kalıcı kapatılanlar için açılış uyarısı (plan §8.5). */
    warnAboutDisabledPlugins() {
        const disabled = getPermanentlyDisabledPlugins();
        if (disabled.length === 0) return;

        showNotification({
            title: "Bazı pluginler kapalı",
            body: `${disabled.join(", ")} art arda çöktürdüğü için kapatıldı.`,
            color: "#e5c890",
            duration: Infinity
        });
    }
});
