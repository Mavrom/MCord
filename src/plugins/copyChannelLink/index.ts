/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { type ContextMenuPatch } from "../../api/contextMenu";
import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

const patch: ContextMenuPatch = (children, props) => {
    const ch = props?.channel;
    if (!ch?.id) return;
    const url = `https://discord.com/channels/${ch.guild_id ?? "@me"}/${ch.id}`;
    children.push({
        type: "mcord-copy-channel-link",
        id: "mcord-copy-channel-link",
        label: "Kanal bağlantısını kopyala",
        action: () => navigator.clipboard?.writeText(url)
    });
};

export default definePlugin({
    name: "CopyChannelLink",
    description: "Bağlam menüsüne kopyalama seçeneği ekler",
    authors: [Devs.Berk],
    tags: ["ui", "kalite-yasam"],
    dependencies: ["ContextMenuAPI"],
    requiresRestart: false,

    contextMenus: {
        "channel-context": patch,
        "thread-context": patch
    }
});
