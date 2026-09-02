/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { type ContextMenuPatch } from "../../api/contextMenu";
import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";
import { PermissionStore } from "../../webpack/common";
import { findStoreLazy } from "../../webpack/lazy";

const GuildMemberStore = findStoreLazy("GuildMemberStore");

function show(title: string, lines: string[]): void {
    const url = URL.createObjectURL(new Blob([[title, ...lines].join("\n")], { type: "text/plain;charset=utf-8" }));
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

const channelMenu: ContextMenuPatch = (children, props) => {
    const channel = props?.channel;
    if (!channel) return;
    children.push({
        type: "mcord-channel-permissions",
        id: "mcord-channel-permissions",
        label: "Kanal izinlerini görüntüle",
        action: () => {
            const bits = PermissionStore?.getChannelPermissions?.({ id: channel.id }) ?? PermissionStore?.getChannelPermissions?.(channel);
            show(`Kanal: ${channel.name ?? channel.id}`, [`İzin bit alanı: ${String(bits ?? "Bilinmiyor")}`]);
        }
    });
};

const userMenu: ContextMenuPatch = (children, props) => {
    const user = props?.user;
    const guildId = props?.guildId ?? props?.guild?.id;
    if (!user || !guildId) return;
    children.push({
        type: "mcord-user-permissions",
        id: "mcord-user-permissions",
        label: "Kullanıcı rollerini görüntüle",
        action: () => {
            const member = GuildMemberStore?.getMember?.(guildId, user.id);
            show(`Kullanıcı: ${user.username ?? user.id}`, [`Rol kimlikleri: ${(member?.roles ?? []).join(", ") || "Yok"}`]);
        }
    });
};

export default definePlugin({
    name: "PermissionsViewer",
    description: "Kanal izin bit alanını ve kullanıcının sunucu rollerini menüden gösterir",
    authors: [Devs.Berk],
    tags: ["izin", "sunucu"],
    dependencies: ["ContextMenuAPI"],
    requiresRestart: false,
    contextMenus: { "channel-context": channelMenu, "user-context": userMenu }
});
