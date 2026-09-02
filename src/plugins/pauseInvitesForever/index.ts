/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { type ContextMenuPatch } from "../../api/contextMenu";
import { Devs } from "../../utils/constants";
import { Logger } from "../../utils/logger";
import { definePlugin } from "../../utils/types";
import { findByKeys } from "../../webpack/finder";

const logger = new Logger("PauseInvitesForever", "#f4b8e4");

async function pause(guild: any): Promise<void> {
    const features = new Set<string>(guild?.features ?? []);
    if (features.has("INVITES_DISABLED")) return;
    features.add("INVITES_DISABLED");
    const rest = findByKeys<any>("get", "patch");
    if (!rest?.patch) {
        logger.warn("Discord REST istemcisi bulunamadı; davetler değiştirilmedi.");
        return;
    }
    try {
        await rest.patch({ url: `/guilds/${guild.id}`, body: { features: [...features] } });
    } catch (error) {
        logger.warn("Sunucu davetleri süresiz duraklatılamadı.", error);
    }
}

const patch: ContextMenuPatch = (children, props) => {
    const guild = props?.guild;
    if (!guild || guild.features?.includes?.("INVITES_DISABLED")) return;
    children.push({
        type: "mcord-pause-invites-forever",
        id: "mcord-pause-invites-forever",
        label: "Davetleri süresiz duraklat",
        danger: true,
        action: () => void pause(guild)
    });
};

export default definePlugin({
    name: "PauseInvitesForever",
    description: "Sunucu menüsüne davetleri süresiz duraklatma seçeneği ekler",
    authors: [Devs.Berk],
    tags: ["sunucu", "davet"],
    dependencies: ["ContextMenuAPI"],
    requiresRestart: false,
    contextMenus: { "guild-context": patch, "guild-header-popout": patch }
});
