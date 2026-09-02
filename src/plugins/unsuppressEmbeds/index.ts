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

const logger = new Logger("UnsuppressEmbeds", "#f4b8e4");
const SUPPRESSED = 1 << 2;

interface RestClient {
    patch?(request: { url: string; body: Record<string, unknown> }): Promise<unknown>;
}

const patchMenu: ContextMenuPatch = (children, props) => {
    const message = props?.message;
    const channel = props?.channel;
    if (typeof message?.id !== "string" || typeof channel?.id !== "string") return;

    const flags = Number(message.flags ?? 0);
    const isSuppressed = (flags & SUPPRESSED) !== 0;
    const hasEmbeds = Array.isArray(message.embeds) && message.embeds.length > 0;
    if (!isSuppressed && !hasEmbeds) return;

    children.push({
        type: "mcord-unsuppress-embeds",
        id: "mcord-unsuppress-embeds",
        label: isSuppressed ? "Gömülü içerikleri göster" : "Gömülü içerikleri gizle",
        danger: !isSuppressed,
        action: async () => {
            const rest = findByKeys<RestClient>("patch", "get");
            if (!rest?.patch) {
                logger.warn("Discord REST istemcisi bulunamadı; mesaj değiştirilmedi.");
                return;
            }

            try {
                await rest.patch({
                    url: `/channels/${channel.id}/messages/${message.id}`,
                    body: { flags: isSuppressed ? flags & ~SUPPRESSED : flags | SUPPRESSED }
                });
            } catch (error) {
                logger.warn("Gömülü içerik durumu değiştirilemedi.", error);
            }
        }
    });
};

export default definePlugin({
    name: "UnsuppressEmbeds",
    description: "Mesaj menüsünden gömülü içerikleri gizler veya yeniden gösterir",
    authors: [Devs.Berk],
    tags: ["mesaj", "medya"],
    dependencies: ["ContextMenuAPI"],
    requiresRestart: false,

    contextMenus: {
        message: patchMenu
    }
});
