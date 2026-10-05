/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { type ContextMenuPatch } from "../../api/contextMenu";
import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";
import { openPermissionsModal } from "./PermissionsModal";

const channelMenu: ContextMenuPatch = (children, props) => {
    const channel = props?.channel;
    if (!channel?.id || channel.guild_id == null) return;
    children.push({
        type: "mcord-channel-permissions",
        id: "mcord-channel-permissions",
        label: "İzinleri görüntüle",
        action: () => openPermissionsModal({ kind: "channel", channelId: channel.id })
    });
};

const guildMenu: ContextMenuPatch = (children, props) => {
    const guildId = props?.guild?.id;
    if (!guildId) return;
    children.push({
        type: "mcord-guild-permissions",
        id: "mcord-guild-permissions",
        label: "İzin haritası",
        action: () => openPermissionsModal({ kind: "guild", guildId })
    });
};

const userMenu: ContextMenuPatch = (children, props) => {
    const user = props?.user;
    const guildId = props?.guildId ?? props?.guild?.id;
    if (!user?.id || !guildId) return;
    children.push({
        type: "mcord-user-permissions",
        id: "mcord-user-permissions",
        label: "Üye izinlerini görüntüle",
        action: () => openPermissionsModal({ kind: "user", guildId, userId: user.id })
    });
};

export default definePlugin({
    name: "PermissionsViewer",
    description: "Kanal izin yapısını, sunucu izin haritasını ve üyelerin rol/izinlerini pencerede gösterir",
    authors: [Devs.Mavrom],
    tags: ["izin", "sunucu"],
    dependencies: ["ContextMenuAPI"],
    requiresRestart: false,
    contextMenus: {
        "channel-context": channelMenu,
        "guild-context": guildMenu,
        "guild-header-popout": guildMenu,
        "user-context": userMenu
    }
});
