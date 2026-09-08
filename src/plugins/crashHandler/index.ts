/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { plugins } from "../../api/PluginManager";
import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { Logger } from "../../utils/logger";
import { definePlugin, OptionType } from "../../utils/types";
import { getFluxDispatcher, transitionTo } from "../../webpack/common";

const logger = new Logger("CrashHandler", "#f4b8e4");
let recovering = false;
let lastRecovery = 0;

const settings = definePluginSettings({
    attemptRecovery: {
        type: OptionType.BOOLEAN,
        description: "Discord hata ekranından otomatik kurtulmayı dene",
        default: true
    },
    navigateHome: {
        type: OptionType.BOOLEAN,
        description: "Kurtarma sırasında DM ana sayfasına dön",
        default: false
    }
});

function closeTransientUi(): void {
    const dispatcher = getFluxDispatcher();
    for (const event of ["CONTEXT_MENU_CLOSE", "USER_PROFILE_MODAL_CLOSE", "LAYER_POP_ALL"]) {
        try {
            dispatcher?.dispatch?.({ type: event });
        } catch (error) {
            logger.debug(`${event} kurtarma olayı gönderilemedi.`, error);
        }
    }
}

export default definePlugin({
    name: "CrashHandler",
    description: "Discord beklenmeyen hata ekranına düştüğünde açık katmanları kapatıp bir kez toparlanmayı dener",
    authors: [Devs.Berk],
    tags: ["güvenilirlik", "yardımcı"],
    settings,

    patches: [{
        find: "#{intl::ERRORS_UNEXPECTED_CRASH}",
        reason: "Discord hata sınırı kurtarma işlemi için olay veya bileşen kancası sunmuyor.",
        // Recovery (çekirdek, `required`) aynı setState'i zaten yakalıyor ve daha
        // kapsamlı (atıf + plugin kapatma + özel ekran). Recovery kayıtlıysa bu
        // patch hiç uygulanmaz — çift sarmalama olmaz. `plugins` init'te dolduğu
        // için predicate patch anında deterministik.
        predicate: () => !plugins.Recovery,
        replacement: {
            match: /this\.setState\((.+?)\)/,
            replace: "$self.handleCrash(this,$1);"
        }
    }],

    handleCrash(boundary: any, errorState: any): void {
        boundary.setState(errorState);
        if (!settings.store.attemptRecovery || recovering || Date.now() - lastRecovery < 1500) return;

        recovering = true;
        lastRecovery = Date.now();
        window.setTimeout(() => {
            try {
                closeTransientUi();
                if (settings.store.navigateHome) transitionTo?.("/channels/@me");
                boundary.setState({ error: null, info: null });
            } catch (error) {
                logger.warn("Discord hata ekranından otomatik kurtarma başarısız oldu.", error);
            } finally {
                recovering = false;
            }
        }, 10);
    },

    stop() {
        recovering = false;
    }
});
