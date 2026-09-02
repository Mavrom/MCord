/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { type ContextMenuPatch } from "../../api/contextMenu";
import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

const patch: ContextMenuPatch = (children, props) => {
    const g = props?.guild;
    if (!g?.id) return;
    children.push({
        type: "mcord-copy-guild-icon",
        id: "mcord-copy-guild-icon",
        label: "Sunucu simgesi bağlantısını kopyala",
        action: () => {
            if (!g.icon) return;
            navigator.clipboard?.writeText(`https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=512`);
        }
    });
};

export default definePlugin({
    name: "CopyGuildIcon",
    description: "Bağlam menüsüne kopyalama seçeneği ekler",
    authors: [Devs.Berk],
    tags: ["ui", "kalite-yasam"],
    dependencies: ["ContextMenuAPI"],
    requiresRestart: false,

    contextMenus: {
        "guild-context": patch
    }
});
