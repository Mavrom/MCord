/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { type ContextMenuPatch } from "../../api/contextMenu";
import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

const patch: ContextMenuPatch = (children, props) => {
    const id = props?.user?.id;
    if (!id) return;
    children.push({
        type: "mcord-copy-mention",
        id: "mcord-copy-mention",
        label: "Etiketi kopyala",
        action: () => navigator.clipboard?.writeText(`<@${id}>`)
    });
};

export default definePlugin({
    name: "CopyUserMention",
    description: "Bağlam menüsüne kopyalama seçeneği ekler",
    authors: [Devs.Berk],
    tags: ["ui", "kalite-yasam"],
    dependencies: ["ContextMenuAPI"],
    requiresRestart: false,

    contextMenus: {
        "user-context": patch
    }
});
