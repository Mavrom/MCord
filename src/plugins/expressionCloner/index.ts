/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import type { ContextMenuPatch } from "../../api/contextMenu";
import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";
import { findStore } from "../../webpack/finder";
import { candidateGuilds, type Data, isGif } from "./clone";
import { openCloneModal } from "./CloneModal";

function cloneMenuItem(type: "Emoji" | "Sticker", getData: () => Data | null): any | null {
    if (candidateGuilds().length === 0) return null;

    const key = type.toLowerCase();
    return {
        type: `mcord-clone-${key}`,
        id: `mcord-clone-${key}`,
        label: type === "Emoji" ? "Emojiyi klonla" : "Çıkartmayı klonla",
        action: () => {
            const data = getData();
            if (data) openCloneModal(data);
        }
    };
}

/** Mesajdaki emoji/çıkartmaya sağ tık. */
const messageMenu: ContextMenuPatch = (children, props) => {
    const { favoriteableId, favoriteableType, itemHref, itemSrc } = props ?? {};
    if (!favoriteableId) return;

    let item: any = null;

    if (favoriteableType === "emoji") {
        const message = props.message;
        const match = String(message?.content ?? "").match(
            new RegExp(`<a?:(\\w+)(?:~\\d+)?:${favoriteableId}>`)
        );
        const reaction = (message?.reactions ?? []).find((r: any) => r.emoji?.id === favoriteableId);
        if (!match && !reaction) return;

        const name = match?.[1] ?? reaction?.emoji?.name ?? "emoji";
        item = cloneMenuItem("Emoji", () => ({
            t: "Emoji",
            id: favoriteableId,
            name,
            animated: isGif(itemHref ?? itemSrc)
        }));
    } else if (favoriteableType === "sticker") {
        const sticker = (props.message?.stickerItems ?? []).find((s: any) => s.id === favoriteableId);
        if (!sticker || sticker.format_type === 3 /* LOTTIE */) return;

        item = cloneMenuItem("Sticker", () => {
            const cached = findStore<any>("StickersStore")?.getStickerById?.(favoriteableId) ?? sticker;
            return {
                t: "Sticker",
                id: favoriteableId,
                name: cached.name,
                tags: cached.tags,
                description: cached.description,
                format_type: cached.format_type
            };
        });
    }

    if (item) children.push(item);
};

/** Emoji/çıkartma seçicisinde sağ tık. */
const pickerMenu: ContextMenuPatch = (children, props) => {
    const target = props?.target as HTMLElement | undefined;
    const { id, name, type } = (target as any)?.dataset ?? {};
    if (!id) return;

    let item: any = null;

    if (type === "emoji" && name) {
        const img = target?.querySelector("img") as HTMLImageElement | null;
        item = cloneMenuItem("Emoji", () => ({ t: "Emoji", id, name, animated: isGif(img?.src) }));
    } else if (type === "sticker" && !String(target?.className ?? "").toLowerCase().includes("lottie")) {
        item = cloneMenuItem("Sticker", () => {
            const sticker = findStore<any>("StickersStore")?.getStickerById?.(id);
            return sticker
                ? {
                    t: "Sticker",
                    id,
                    name: sticker.name,
                    tags: sticker.tags,
                    description: sticker.description,
                    format_type: sticker.format_type
                }
                : null;
        });
    }

    if (item) children.push(item);
};

export default definePlugin({
    name: "ExpressionCloner",
    description: "Emoji ve çıkartmaları sağ tıklayıp sahibi ya da yetkin olduğun bir sunucuya klonlar",
    authors: [Devs.Berk],
    tags: ["emoji", "çıkartma", "sunucu"],
    dependencies: ["ContextMenuAPI"],
    requiresRestart: false,
    contextMenus: {
        message: messageMenu,
        "expression-picker": pickerMenu
    }
});
