/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { type ContextMenuPatch } from "../../api/contextMenu";
import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { Logger } from "../../utils/logger";
import { definePlugin, OptionType, StartAt } from "../../utils/types";
import { GuildStore } from "../../webpack/common";
import { findByKeys } from "../../webpack/finder";

const logger = new Logger("NewGuildSettings", "#f4b8e4");
const knownGuilds = new Set<string>();

const settings = definePluginSettings({
    muteGuild: { type: OptionType.BOOLEAN, description: "Yeni sunucuyu sustur", default: true },
    messageNotifications: {
        type: OptionType.SELECT,
        description: "Yeni sunucunun mesaj bildirimleri",
        options: [
            { label: "Sunucu varsayılanı", value: 3, default: true },
            { label: "Tüm mesajlar", value: 0 },
            { label: "Yalnızca etiketler", value: 1 },
            { label: "Hiçbiri", value: 2 }
        ]
    },
    suppressEveryone: { type: OptionType.BOOLEAN, description: "@everyone ve @here bildirimlerini bastır", default: true },
    suppressRoles: { type: OptionType.BOOLEAN, description: "Rol etiketlerini bastır", default: true },
    muteEvents: { type: OptionType.BOOLEAN, description: "Yeni etkinlik bildirimlerini sustur", default: true },
    suppressHighlights: { type: OptionType.BOOLEAN, description: "Öne çıkanlar bildirimlerini bastır", default: true }
});

function applyDefaults(guildId: string): void {
    const actions = findByKeys<any>("updateGuildNotificationSettings");
    if (typeof actions?.updateGuildNotificationSettings !== "function") {
        logger.warn("Sunucu bildirim ayarları işlevi bulunamadı; varsayılanlar uygulanmadı.");
        return;
    }

    const values: Record<string, unknown> = {
        muted: settings.store.muteGuild,
        suppress_everyone: settings.store.suppressEveryone,
        suppress_roles: settings.store.suppressRoles,
        mute_scheduled_events: settings.store.muteEvents,
        notify_highlights: settings.store.suppressHighlights ? 1 : 0
    };
    if (settings.store.messageNotifications !== 3) values.message_notifications = settings.store.messageNotifications;

    try {
        actions.updateGuildNotificationSettings(guildId, values);
    } catch (error) {
        logger.warn("Yeni sunucu varsayılanları uygulanamadı.", error);
    }
}

const menu: ContextMenuPatch = (children, props) => {
    const guildId = props?.guild?.id;
    if (!guildId) return;
    children.push({
        type: "mcord-apply-new-guild-settings",
        id: "mcord-apply-new-guild-settings",
        label: "Yeni sunucu varsayılanlarını uygula",
        action: () => applyDefaults(guildId)
    });
};

export default definePlugin({
    name: "NewGuildSettings",
    description: "Katıldığın yeni sunuculara seçtiğin bildirim ve susturma ayarlarını otomatik uygular",
    authors: [Devs.Berk],
    tags: ["sunucu", "bildirim"],
    dependencies: ["ContextMenuAPI"],
    startAt: StartAt.ConnectionOpen,
    settings,
    contextMenus: { "guild-context": menu, "guild-header-popout": menu },

    start() {
        for (const id of Object.keys(GuildStore?.getGuilds?.() ?? {})) knownGuilds.add(id);
    },

    stop() {
        knownGuilds.clear();
    },

    flux: {
        GUILD_CREATE(event: any) {
            const guildId = event?.guild?.id ?? event?.id;
            if (!guildId || event?.guild?.unavailable || knownGuilds.has(guildId)) return;
            knownGuilds.add(guildId);
            applyDefaults(guildId);
        }
    }
});
