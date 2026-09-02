/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { type ContextMenuPatch } from "../../api/contextMenu";
import { Devs } from "../../utils/constants";
import { Logger } from "../../utils/logger";
import { definePlugin } from "../../utils/types";
import { GuildStore, UserStore } from "../../webpack/common";
import { findByKeys, findStore } from "../../webpack/finder";

const logger = new Logger("ExpressionCloner", "#f4b8e4");

interface Expression {
    type: "emoji" | "sticker";
    id: string;
    name: string;
    animated?: boolean;
    description?: string;
    tags?: string;
    format_type?: number;
}

function sourceUrl(expression: Expression): string {
    const environment = (window as any).GLOBAL_ENV ?? {};
    if (expression.type === "emoji") {
        const host = environment.CDN_HOST ?? "cdn.discordapp.com";
        return `${location.protocol}//${host}/emojis/${expression.id}.${expression.animated ? "gif" : "webp"}?size=128&quality=lossless`;
    }

    const extension = expression.format_type === 3 ? "json" : expression.format_type === 4 ? "gif" : "png";
    const host = environment.MEDIA_PROXY_ENDPOINT ?? `${location.protocol}//media.discordapp.net`;
    return `${host}/stickers/${expression.id}.${extension}?size=320&quality=lossless`;
}

function toDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(reader.error);
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(blob);
    });
}

async function cloneExpression(guildId: string, expression: Expression): Promise<void> {
    const rest = findByKeys<any>("get", "post", "patch");
    if (typeof rest?.post !== "function") {
        logger.warn("Discord REST istemcisi bulunamadı; ifade kopyalanmadı.");
        return;
    }

    try {
        const response = await fetch(sourceUrl(expression));
        if (!response.ok) throw new Error(`Medya HTTP ${response.status}`);
        const blob = await response.blob();

        if (expression.type === "emoji") {
            await rest.post({
                url: `/guilds/${guildId}/emojis`,
                body: { name: expression.name.split("~")[0], image: await toDataUrl(blob) }
            });
        } else {
            const body = new FormData();
            body.append("name", expression.name);
            body.append("description", expression.description ?? "");
            body.append("tags", expression.tags || "🙂");
            body.append("file", blob, `${expression.name}.${expression.format_type === 3 ? "json" : "png"}`);
            await rest.post({ url: `/guilds/${guildId}/stickers`, body });
        }
    } catch (error) {
        logger.warn(`${expression.name} hedef sunucuya kopyalanamadı.`, error);
    }
}

function resolveExpression(props: any): Expression | null {
    const target = props?.target as HTMLElement | undefined;
    const id = target?.dataset?.id;
    const name = target?.dataset?.name;
    if (target?.dataset?.type === "emoji" && id && name) {
        const image = target.querySelector("img")?.src ?? "";
        return { type: "emoji", id, name, animated: image.includes("animated=true") || image.includes(".gif") };
    }

    if (!id) return null;
    const sticker = findStore<any>("StickersStore")?.getStickerById?.(id);
    return sticker ? { type: "sticker", ...sticker } : null;
}

const menu: ContextMenuPatch = (children, props) => {
    const expression = resolveExpression(props);
    if (!expression) return;

    const currentUserId = UserStore?.getCurrentUser?.()?.id;
    const guilds = Object.values<any>(GuildStore?.getGuilds?.() ?? {})
        .filter(guild => guild?.ownerId === currentUserId)
        .sort((a, b) => String(a.name).localeCompare(String(b.name)));
    if (!guilds.length) return;

    children.push({
        type: "mcord-clone-expression",
        id: "mcord-clone-expression",
        label: `${expression.type === "emoji" ? "Emojiyi" : "Çıkartmayı"} sunucuya kopyala`,
        children: guilds.map(guild => ({
            type: "mcord-clone-expression-target",
            id: `mcord-clone-${expression.id}-${guild.id}`,
            label: guild.name,
            action: () => void cloneExpression(guild.id, expression)
        }))
    });
};

export default definePlugin({
    name: "ExpressionCloner",
    description: "Emoji ve çıkartmaları sahibi olduğun başka bir sunucuya bağlam menüsünden kopyalar",
    authors: [Devs.Berk],
    tags: ["emoji", "çıkartma"],
    dependencies: ["ContextMenuAPI"],
    requiresRestart: false,
    contextMenus: { "expression-picker": menu }
});
