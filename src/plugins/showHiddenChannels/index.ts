/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { showNotification } from "../../api/notifications";
import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { Logger } from "../../utils/logger";
import { definePlugin, OptionType, StartAt } from "../../utils/types";
import { PermissionStore } from "../../webpack/common";
import { findByKeys } from "../../webpack/finder";

const logger = new Logger("ShowHiddenChannels", "#a6d189");

/** Discord izin bayrağı: VIEW_CHANNEL (1 << 10). */
const VIEW_CHANNEL = 1024n;

const settings = definePluginSettings({
    showVoiceChannels: {
        type: OptionType.BOOLEAN,
        description: "Gizli ses kanallarını da göster",
        default: true
    },
    blockNavigation: {
        type: OptionType.BOOLEAN,
        description: "Gizli kanala tıklandığında açmayı engelle ve uyar",
        default: true
    }
});

/** Kanal tipi → ses kanalı mı. */
const VOICE_TYPES = new Set([2, 13]);

export default definePlugin({
    name: "ShowHiddenChannels",
    description: "Görme iznin olmayan kanalları kanal listesinde gösterir",
    authors: [Devs.MCord],
    tags: ["ui", "kanal"],
    settings,

    /**
     * Kod patch'i **yok**.
     *
     * Kanal listesi görünürlüğü `PermissionStore.can` sonucuna bağlı; bu
     * fonksiyon webpack'ten doğrudan erişilebilir olduğu için `after` patch'i
     * yeterli (plan §5.1). Kilit ikonu gibi görsel işaretler kod patch'i
     * gerektirdiğinden bilinçli olarak kapsam dışı — bkz. README.
     */
    requiresRestart: false,
    startAt: StartAt.ConnectionOpen,

    start() {
        // Store adına göre bulunuyor — Discord property adlarını mangle etse
        // bile `getName()` sabit kalıyor.
        if (typeof PermissionStore?.can !== "function") {
            logger.error("PermissionStore bulunamadı.");
            return;
        }

        this.patcher.after(PermissionStore, "can", (_self, args, returnValue) => {
            if (returnValue === true) return returnValue;

            const [permission, context] = args;
            if (!isViewChannel(permission)) return returnValue;

            const channel = context?.channel ?? context;
            if (!isChannelLike(channel)) return returnValue;

            if (!settings.store.showVoiceChannels && VOICE_TYPES.has(channel.type)) {
                return returnValue;
            }

            hiddenChannels.add(channel.id);
            return true;
        });

        if (settings.store.blockNavigation) this.blockNavigation();
    },

    stop() {
        hiddenChannels.clear();
    },

    /** Gizli kanala girmeye çalışmak 403 döndürüp arayüzü bozuyor; engelliyoruz. */
    blockNavigation() {
        const ChannelActions = findByKeys("selectChannel", "selectVoiceChannel");
        if (!ChannelActions) {
            logger.warn("Kanal seçme modülü bulunamadı, gezinme engellenemiyor.");
            return;
        }

        this.patcher.instead(ChannelActions, "selectChannel", (self, args, original) => {
            const channelId = args[0]?.channelId ?? args[1];

            if (channelId && hiddenChannels.has(channelId)) {
                showNotification({
                    title: "Gizli kanal",
                    body: "Bu kanalı görme iznin yok; içeriği yüklenemez.",
                    color: "#e5c890"
                });
                return undefined;
            }

            return original.apply(self, args);
        });
    }
});

/** Bu oturumda gizli olduğu tespit edilen kanallar. */
const hiddenChannels = new Set<string>();

export function isHidden(channelId: string): boolean {
    return hiddenChannels.has(channelId);
}

function isViewChannel(permission: unknown): boolean {
    if (typeof permission === "bigint") return permission === VIEW_CHANNEL;
    if (typeof permission === "number") return BigInt(permission) === VIEW_CHANNEL;
    return false;
}

function isChannelLike(value: any): value is { id: string; type: number } {
    return value != null && typeof value.id === "string" && typeof value.type === "number";
}
