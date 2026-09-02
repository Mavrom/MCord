/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { type ContextMenuPatch } from "../../api/contextMenu";
import { Devs } from "../../utils/constants";
import { Logger } from "../../utils/logger";
import { definePlugin } from "../../utils/types";

const logger = new Logger("CopyUserURLs", "#f4b8e4");

async function copyUserUrl(userId: string): Promise<void> {
    try {
        await navigator.clipboard?.writeText(`<https://discord.com/users/${userId}>`);
    } catch (err) {
        logger.warn("Kullanıcı bağlantısı panoya kopyalanamadı:", err);
    }
}

const patch: ContextMenuPatch = (children, props) => {
    const userId = props?.user?.id;
    if (typeof userId !== "string") return;

    children.push({
        type: "mcord-copy-user-url",
        id: "mcord-copy-user-url",
        label: "Kullanıcı bağlantısını kopyala",
        action: () => void copyUserUrl(userId)
    });
};

export default definePlugin({
    name: "CopyUserURLs",
    description: "Kullanıcı menüsüne Discord profil bağlantısını kopyalama seçeneği ekler",
    authors: [Devs.Berk],
    tags: ["ui", "kalite-yasam"],
    dependencies: ["ContextMenuAPI"],
    requiresRestart: false,

    contextMenus: {
        "user-context": patch
    }
});
