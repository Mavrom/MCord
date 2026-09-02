/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { type ContextMenuPatch } from "../../api/contextMenu";
import { Devs } from "../../utils/constants";
import { Logger } from "../../utils/logger";
import { definePlugin } from "../../utils/types";
import { findStore } from "../../webpack/finder";
import { getStickerUrl, type StickerUrlInput } from "./url";

const logger = new Logger("CopyStickerLinks", "#f4b8e4");

interface StickerStore {
    getStickerById?(id: string): StickerUrlInput | undefined;
}

interface DiscordEnvironment {
    CDN_HOST?: string;
    MEDIA_PROXY_ENDPOINT?: string;
}

function buildUrl(sticker: StickerUrlInput): string | null {
    const environment = (window as Window & { GLOBAL_ENV?: DiscordEnvironment }).GLOBAL_ENV;
    return getStickerUrl(sticker, {
        cdnHost: environment?.CDN_HOST,
        mediaProxyEndpoint: environment?.MEDIA_PROXY_ENDPOINT
    });
}

async function copy(url: string): Promise<void> {
    try {
        await navigator.clipboard?.writeText(url);
    } catch (err) {
        logger.warn("Çıkartma bağlantısı panoya kopyalanamadı:", err);
    }
}

function addItems(children: any[], sticker: StickerUrlInput): void {
    const url = buildUrl(sticker);
    if (!url) return;

    children.push(
        {
            type: "mcord-copy-sticker-link",
            id: "mcord-copy-sticker-link",
            label: "Çıkartma bağlantısını kopyala",
            action: () => void copy(url)
        },
        {
            type: "mcord-open-sticker-link",
            id: "mcord-open-sticker-link",
            label: "Çıkartma bağlantısını aç",
            action: () => void window.McordNative.app.openExternal(url).catch(err =>
                logger.warn("Çıkartma bağlantısı açılamadı:", err))
        }
    );
}

const messagePatch: ContextMenuPatch = (children, props) => {
    if (props?.favoriteableType !== "sticker" || typeof props?.favoriteableId !== "string") return;

    const sticker = props?.message?.stickerItems?.find(
        (item: StickerUrlInput) => item.id === props.favoriteableId
    );
    if (sticker) addItems(children, sticker);
};

const pickerPatch: ContextMenuPatch = (children, props) => {
    const target = props?.target as HTMLElement | undefined;
    const id = target?.dataset?.id;
    if (!id || String(target.className).includes("lottieCanvas")) return;

    const store = findStore<StickerStore>("StickersStore");
    if (!store?.getStickerById) {
        logger.warn("StickersStore bulunamadı; çıkartma menüsü değiştirilmedi.");
        return;
    }

    const sticker = store.getStickerById(id);
    if (sticker) addItems(children, sticker);
};

export default definePlugin({
    name: "CopyStickerLinks",
    description: "Çıkartma menülerine bağlantıyı kopyalama ve açma seçenekleri ekler",
    authors: [Devs.Berk],
    tags: ["emoji", "kalite-yasam"],
    dependencies: ["ContextMenuAPI"],
    requiresRestart: false,

    contextMenus: {
        message: messagePatch,
        "expression-picker": pickerPatch
    }
});
