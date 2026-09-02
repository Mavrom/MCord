/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { type ContextMenuPatch } from "../../api/contextMenu";
import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

const patch: ContextMenuPatch = (children, props) => {
    const content = props?.message?.content;
    if (!content) return;
    children.push({
        type: "mcord-copy-raw",
        id: "mcord-copy-raw",
        label: "Ham metni kopyala",
        action: () => navigator.clipboard?.writeText(content)
    });
};

export default definePlugin({
    name: "CopyMessageText",
    description: "Bağlam menüsüne kopyalama seçeneği ekler",
    authors: [Devs.Berk],
    tags: ["ui", "kalite-yasam"],
    dependencies: ["ContextMenuAPI"],
    requiresRestart: false,

    contextMenus: {
        "message": patch
    }
});
