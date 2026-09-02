/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { type ContextMenuPatch } from "../../api/contextMenu";
import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

function snowflakeDate(id: string): string {
    try {
        return new Date(Number(BigInt(id) >> 22n) + 1420070400000).toLocaleString("tr-TR");
    } catch {
        return "Bilinmiyor";
    }
}

function openInfo(guild: any): void {
    const lines = [
        `Sunucu: ${guild.name}`,
        `Kimlik: ${guild.id}`,
        `Sahip: ${guild.ownerId ?? guild.owner_id ?? "Bilinmiyor"}`,
        `Üye sayısı: ${guild.memberCount ?? "Bilinmiyor"}`,
        `Oluşturulma: ${snowflakeDate(guild.id)}`,
        `Özellikler: ${(guild.features ?? []).join(", ") || "Yok"}`
    ];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" }));
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

const patch: ContextMenuPatch = (children, props) => {
    if (!props?.guild) return;
    children.push({ type: "mcord-server-info", id: "mcord-server-info", label: "Sunucu bilgisi", action: () => openInfo(props.guild) });
};

export default definePlugin({
    name: "ServerInfo",
    description: "Sunucu menüsünden kimlik, sahip, üye sayısı ve oluşturulma bilgisini gösterir",
    authors: [Devs.Berk],
    tags: ["sunucu", "bilgi"],
    dependencies: ["ContextMenuAPI"],
    requiresRestart: false,
    contextMenus: { "guild-context": patch, "guild-header-popout": patch }
});
