/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { type ContextMenuPatch } from "../../api/contextMenu";
import { definePluginSettings } from "../../api/settings";
import { getUserSettingLazy } from "../../api/userSettings";
import { Devs } from "../../utils/constants";
import { Logger } from "../../utils/logger";
import { definePlugin, OptionType } from "../../utils/types";
import { GuildStore } from "../../webpack/common";
import { findByKeys } from "../../webpack/finder";
import { findStoreLazy } from "../../webpack/lazy";

const logger = new Logger("BetterRoleContext", "#f4b8e4");
const GuildRoleStore = findStoreLazy("GuildRoleStore");
const SelectedGuildStore = findStoreLazy("SelectedGuildStore");
const developerMode = getUserSettingLazy<boolean>("appearance", "developerMode");

const settings = definePluginSettings({
    iconFormat: {
        type: OptionType.SELECT,
        description: "Rol simgesi açılırken kullanılacak biçim",
        options: [
            { label: "PNG", value: "png", default: true },
            { label: "WebP", value: "webp" },
            { label: "JPG", value: "jpg" }
        ]
    }
});

async function copy(text: string): Promise<void> {
    try {
        await navigator.clipboard.writeText(text);
    } catch (error) {
        logger.warn("Rol bilgisi panoya kopyalanamadı.", error);
    }
}

function openRoleEditor(guildId: string, roleId: string): void {
    const actions = findByKeys<any>("open", "selectRole", "updateGuild");
    if (!actions?.open || !actions?.selectRole) {
        logger.warn("Discord rol ayarları işlevi bulunamadı.");
        return;
    }
    void Promise.resolve(actions.open(guildId, "ROLES")).then(() => actions.selectRole(roleId));
}

const menu: ContextMenuPatch = (children, props) => {
    const guildId = props?.guild?.id ?? props?.guildId ?? SelectedGuildStore?.getGuildId?.();
    const roleId = props?.role?.id ?? props?.id;
    const guild = guildId && GuildStore?.getGuild?.(guildId);
    const role = props?.role ?? (guildId && roleId ? GuildRoleStore?.getRole?.(guildId, roleId) : null);
    if (!guild || !role) return;

    children.unshift({
        type: "mcord-edit-role",
        id: "mcord-edit-role",
        label: "Rolü düzenle",
        action: () => openRoleEditor(guild.id, role.id)
    });

    const color = role.colorString ?? (role.color ? `#${Number(role.color).toString(16).padStart(6, "0")}` : null);
    if (color) children.push({
        type: "mcord-copy-role-color",
        id: "mcord-copy-role-color",
        label: `Rol rengini kopyala (${color})`,
        action: () => void copy(color)
    });

    if (role.icon) {
        const host = (window as any).GLOBAL_ENV?.CDN_HOST ?? "cdn.discordapp.com";
        const url = `${location.protocol}//${host}/role-icons/${role.id}/${role.icon}.${settings.store.iconFormat}`;
        children.push({
            type: "mcord-view-role-icon",
            id: "mcord-view-role-icon",
            label: "Rol simgesini aç",
            action: () => void window.McordNative.app.openExternal(url)
        });
    }
};

export default definePlugin({
    name: "BetterRoleContext",
    description: "Rol menüsüne düzenleme, renk kopyalama ve simge açma işlemleri ekler",
    authors: [Devs.Berk],
    tags: ["rol", "sunucu"],
    dependencies: ["ContextMenuAPI", "UserSettingsAPI"],
    settings,
    contextMenus: { "dev-context": menu, "role-context": menu },

    async start() {
        if (typeof developerMode.updateSetting === "function" && !developerMode.getSetting?.()) {
            await developerMode.updateSetting(true);
        }
    }
});
