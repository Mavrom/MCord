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

const logger = new Logger("QuickMention", "#f4b8e4");

interface ComponentDispatch {
    dispatchToLastSubscribed?(event: string, payload: { rawText: string; plainText: string }): void;
}

function insertMention(userId: string): void {
    const dispatch = findByKeys<ComponentDispatch>("dispatchToLastSubscribed");
    if (!dispatch?.dispatchToLastSubscribed) {
        logger.warn("ComponentDispatch bulunamadı; hızlı bahsetme uygulanmadı.");
        return;
    }

    const text = `<@${userId}> `;
    try {
        dispatch.dispatchToLastSubscribed("INSERT_TEXT", { rawText: text, plainText: text });
    } catch (err) {
        logger.warn("Bahsetme metni sohbet kutusuna eklenemedi:", err);
    }
}

const patch: ContextMenuPatch = (children, props) => {
    const userId = props?.message?.author?.id;
    if (typeof userId !== "string") return;

    children.push({
        type: "mcord-quick-mention",
        id: "mcord-quick-mention",
        label: "Hızlıca bahset",
        action: () => insertMention(userId)
    });
};

export default definePlugin({
    name: "QuickMention",
    description: "Mesaj menüsünden yazara hızlıca bahsetmeyi sağlar",
    authors: [Devs.Berk],
    tags: ["mesaj", "kalite-yasam"],
    dependencies: ["ContextMenuAPI"],
    requiresRestart: false,

    contextMenus: {
        message: patch
    }
});
