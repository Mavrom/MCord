/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { type ContextMenuPatch } from "../../api/contextMenu";
import { Devs } from "../../utils/constants";
import { Logger } from "../../utils/logger";
import { definePlugin } from "../../utils/types";
import { findStoreLazy } from "../../webpack/lazy";

const logger = new Logger("BiggerStreamPreview", "#f4b8e4");
const StreamingStore = findStoreLazy("ApplicationStreamingStore");
const PreviewStore = findStoreLazy("ApplicationStreamPreviewStore");

async function openPreview(stream: any): Promise<void> {
    try {
        const url = await PreviewStore?.getPreviewURL?.(stream.guildId, stream.channelId, stream.ownerId);
        if (typeof url === "string") window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
        logger.warn("Yayın önizlemesi açılamadı.", error);
    }
}

function addPreview(children: any[], userId: string | undefined): void {
    if (typeof userId !== "string") return;
    const stream = StreamingStore?.getAnyStreamForUser?.(userId);
    if (!stream) return;

    children.push({
        type: "mcord-stream-preview",
        id: "mcord-stream-preview",
        label: "Yayın önizlemesini büyüt",
        action: () => void openPreview(stream)
    });
}

const userMenu: ContextMenuPatch = (children, props) => addPreview(children, props?.user?.id ?? props?.userId);
const streamMenu: ContextMenuPatch = (children, props) => addPreview(children, props?.stream?.ownerId);

export default definePlugin({
    name: "BiggerStreamPreview",
    description: "Kullanıcı ve yayın menüsünden yayın önizlemesini büyük açar",
    authors: [Devs.Berk],
    tags: ["yayın", "medya"],
    dependencies: ["ContextMenuAPI"],
    requiresRestart: false,

    contextMenus: {
        "user-context": userMenu,
        "stream-context": streamMenu
    }
});
