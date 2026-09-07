/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { showNotification } from "../../api/notifications";
import { Logger } from "../../utils/logger";
import { getFluxDispatcher, GuildStore, PermissionStore, UserStore } from "../../webpack/common";
import { findByKeys } from "../../webpack/finder";

export const logger = new Logger("ExpressionCloner", "#f4b8e4");

/** Discord'un REST istemcisi — çağrı anında çözülüyor. */
function getRest(): any {
    return findByKeys<any>("get", "post", "patch", "put");
}

/** İzin biti: CREATE_GUILD_EXPRESSIONS = 1 << 43. */
const CREATE_GUILD_EXPRESSIONS = 1n << 43n;

const MAX_EMOJI_BYTES = 256 * 1024;
const MAX_STICKER_BYTES = 512 * 1024;

/** Discord sticker `format_type` → uzantı (1/2 PNG, 3 LOTTIE, 4 GIF). */
export const STICKER_EXT: Record<number, string> = { 1: "png", 2: "png", 3: "json", 4: "gif" };

export interface EmojiData { t: "Emoji"; id: string; name: string; animated: boolean }
export interface StickerData {
    t: "Sticker";
    id: string;
    name: string;
    tags?: string;
    description?: string;
    format_type?: number;
}
export type Data = EmojiData | StickerData;

function env(): Record<string, any> {
    return (window as any).GLOBAL_ENV ?? {};
}

export function mediaUrl(data: Data, size: number): string {
    if (data.t === "Emoji") {
        const host = env().CDN_HOST ?? "cdn.discordapp.com";
        return `${location.protocol}//${host}/emojis/${data.id}.webp?size=${size}&lossless=true&animated=true`;
    }

    const ext = STICKER_EXT[data.format_type ?? 1] ?? "png";
    const proxy = env().MEDIA_PROXY_ENDPOINT ?? `${location.protocol}//media.discordapp.net`;
    return `${proxy}/stickers/${data.id}.${ext}?size=${size}&lossless=true`;
}

export function guildIconUrl(guild: any, size = 64): string | null {
    if (!guild?.icon) return null;
    const ext = String(guild.icon).startsWith("a_") ? "gif" : "webp";
    return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${ext}?size=${size}`;
}

export function guildAcronym(name: string): string {
    return String(name)
        .replace(/'s /g, " ")
        .replace(/\w+/g, word => word[0])
        .replace(/\s/g, "")
        .slice(0, 3);
}

/** referans katalog yaklaşımı: büyükten başla, boyut sınırına inene kadar yarıla. */
async function fetchBlob(data: Data): Promise<Blob> {
    const max = data.t === "Sticker" ? MAX_STICKER_BYTES : MAX_EMOJI_BYTES;

    for (let size = 4096; size >= 16; size /= 2) {
        const url = mediaUrl(data, size);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Medya HTTP ${res.status}`);

        const blob = await res.blob();
        if (blob.size <= max) return blob;
    }

    throw new Error(`${data.t} boyut sınırına sığmadı`);
}

function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(reader.error);
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(blob);
    });
}

/** Emoji adı `[A-Za-z0-9_]`, 2–32 karakter olmalı. */
export function safeEmojiName(raw: string): string {
    const cleaned = raw.split("~")[0].replace(/[^A-Za-z0-9_]/g, "");
    return cleaned.length >= 2 ? cleaned.slice(0, 32) : `emoji_${cleaned}`.slice(0, 32);
}

async function cloneEmoji(guildId: string, emoji: EmojiData): Promise<void> {
    const dataUrl = await blobToDataUrl(await fetchBlob(emoji));

    const rest = getRest();
    if (typeof rest?.post !== "function") throw new Error("Discord REST istemcisi bulunamadı");

    // Sadece POST — Discord'un gateway'i oluşturulan emojiyi kendi push'luyor.
    // Elle `GUILD_EMOJIS_UPDATE` dispatch etmek yanlış şekilde store'u çökertiyordu.
    await rest.post({
        url: `/guilds/${guildId}/emojis`,
        body: { name: safeEmojiName(emoji.name), image: dataUrl, roles: [] }
    });
}

async function cloneSticker(guildId: string, sticker: StickerData): Promise<void> {
    const rest = getRest();
    if (typeof rest?.post !== "function") throw new Error("Discord REST istemcisi bulunamadı");

    const form = new FormData();
    form.append("name", sticker.name);
    form.append("tags", sticker.tags || "🙂");
    form.append("description", sticker.description ?? "");
    form.append(
        "file",
        await fetchBlob(sticker),
        `${sticker.name}.${STICKER_EXT[sticker.format_type ?? 1] ?? "png"}`
    );

    const { body } = await rest.post({ url: `/guilds/${guildId}/stickers`, body: form });

    getFluxDispatcher()?.dispatch?.({
        type: "GUILD_STICKERS_CREATE_SUCCESS",
        guildId,
        sticker: { ...body, user: UserStore?.getCurrentUser?.() }
    });
}

export async function doClone(guildId: string, data: Data): Promise<void> {
    const guildName = GuildStore?.getGuild?.(guildId)?.name ?? "sunucu";

    try {
        if (data.t === "Emoji") await cloneEmoji(guildId, data);
        else await cloneSticker(guildId, data);

        showNotification({
            title: "ExpressionCloner",
            body: `${data.name} → ${guildName} kopyalandı`,
            color: "var(--green-360, #23a55a)"
        });
    } catch (err: any) {
        let message = "bir şeyler ters gitti (konsola bak)";
        try {
            message = JSON.parse(err?.text).message;
        } catch { /* düz metin */ }

        logger.error("Kopyalama başarısız:", data.name, "→", guildId, err);
        showNotification({
            title: "ExpressionCloner",
            body: `Kopyalanamadı: ${message}`,
            color: "var(--red-400, #f23f43)"
        });
        throw err;
    }
}

/** Kendine ait ya da ifade oluşturma iznin olan sunucular. */
export function candidateGuilds(): any[] {
    const meId = UserStore?.getCurrentUser?.()?.id;

    return Object.values<any>(GuildStore?.getGuilds?.() ?? {})
        .filter(guild => {
            if (guild?.ownerId === meId) return true;
            try {
                const perms = (PermissionStore as any)?.getGuildPermissions?.({ id: guild.id }) ?? 0n;
                return (BigInt(perms) & CREATE_GUILD_EXPRESSIONS) === CREATE_GUILD_EXPRESSIONS;
            } catch {
                return false;
            }
        })
        .sort((a, b) => String(a.name).localeCompare(String(b.name), "tr"));
}

export function isGif(url?: string | null): boolean {
    if (!url) return false;
    try {
        const u = new URL(url);
        return u.pathname.endsWith(".gif") || u.searchParams.get("animated") === "true";
    } catch {
        return false;
    }
}
