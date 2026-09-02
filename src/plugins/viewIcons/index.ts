/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { type ContextMenuPatch } from "../../api/contextMenu";
import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { definePlugin, OptionType } from "../../utils/types";

const settings = definePluginSettings({
    size: {
        type: OptionType.SELECT,
        description: "Açılacak görsel boyutu",
        options: ["256", "512", "1024", "2048", "4096"].map(value => ({ label: value, value, default: value === "1024" }))
    }
});

function extension(hash: string): string {
    return hash.startsWith("a_") ? "gif" : "webp";
}

function open(url: string): void {
    window.open(`${url}?size=${settings.store.size}`, "_blank", "noopener,noreferrer");
}

const userMenu: ContextMenuPatch = (children, props) => {
    const user = props?.user;
    if (typeof user?.id !== "string" || typeof user?.avatar !== "string") return;
    children.push({
        type: "mcord-view-avatar",
        id: "mcord-view-avatar",
        label: "Avatarı aç",
        action: () => open(`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${extension(user.avatar)}`)
    });
};

const guildMenu: ContextMenuPatch = (children, props) => {
    const guild = props?.guild;
    if (typeof guild?.id !== "string") return;
    if (typeof guild.icon === "string") children.push({
        type: "mcord-view-guild-icon",
        id: "mcord-view-guild-icon",
        label: "Sunucu simgesini aç",
        action: () => open(`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${extension(guild.icon)}`)
    });
    if (typeof guild.banner === "string") children.push({
        type: "mcord-view-guild-banner",
        id: "mcord-view-guild-banner",
        label: "Sunucu afişini aç",
        action: () => open(`https://cdn.discordapp.com/banners/${guild.id}/${guild.banner}.${extension(guild.banner)}`)
    });
};

const groupMenu: ContextMenuPatch = (children, props) => {
    const channel = props?.channel;
    if (typeof channel?.id !== "string" || typeof channel?.icon !== "string") return;
    children.push({
        type: "mcord-view-group-icon",
        id: "mcord-view-group-icon",
        label: "Grup simgesini aç",
        action: () => open(`https://cdn.discordapp.com/channel-icons/${channel.id}/${channel.icon}.webp`)
    });
};

export default definePlugin({
    name: "ViewIcons",
    description: "Kullanıcı, sunucu ve grup menülerinden simge ve avatarları tam boy açar",
    authors: [Devs.Berk],
    tags: ["medya", "görünüm"],
    dependencies: ["ContextMenuAPI"],
    settings,
    requiresRestart: false,

    contextMenus: {
        "user-context": userMenu,
        "guild-context": guildMenu,
        "gdm-context": groupMenu
    }
});
