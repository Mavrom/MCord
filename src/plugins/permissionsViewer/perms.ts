/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/** İzin anahtarı → Türkçe ad. Bilinmeyenler `permissionLabel` ile okunur hale getirilir. */
export const PERMISSION_LABELS: Record<string, string> = {
    CREATE_INSTANT_INVITE: "Davet oluştur",
    KICK_MEMBERS: "Üyeleri at",
    BAN_MEMBERS: "Üyeleri yasakla",
    ADMINISTRATOR: "Yönetici",
    MANAGE_CHANNELS: "Kanalları yönet",
    MANAGE_GUILD: "Sunucuyu yönet",
    ADD_REACTIONS: "Tepki ekle",
    VIEW_AUDIT_LOG: "Denetim kaydını gör",
    PRIORITY_SPEAKER: "Öncelikli konuşmacı",
    STREAM: "Yayın yap",
    VIEW_CHANNEL: "Kanalı gör",
    SEND_MESSAGES: "Mesaj gönder",
    SEND_TTS_MESSAGES: "Sesli (TTS) mesaj gönder",
    MANAGE_MESSAGES: "Mesajları yönet",
    EMBED_LINKS: "Bağlantı göm",
    ATTACH_FILES: "Dosya ekle",
    READ_MESSAGE_HISTORY: "Mesaj geçmişini oku",
    MENTION_EVERYONE: "@everyone etiketle",
    USE_EXTERNAL_EMOJIS: "Harici emoji kullan",
    VIEW_GUILD_ANALYTICS: "Sunucu içgörülerini gör",
    CONNECT: "Bağlan",
    SPEAK: "Konuş",
    MUTE_MEMBERS: "Üyeleri sustur",
    DEAFEN_MEMBERS: "Üyeleri sağırlaştır",
    MOVE_MEMBERS: "Üyeleri taşı",
    USE_VAD: "Ses etkinliği kullan",
    CHANGE_NICKNAME: "Takma ad değiştir",
    MANAGE_NICKNAMES: "Takma adları yönet",
    MANAGE_ROLES: "Rolleri yönet",
    MANAGE_WEBHOOKS: "Webhook'ları yönet",
    MANAGE_GUILD_EXPRESSIONS: "İfadeleri yönet",
    USE_APPLICATION_COMMANDS: "Uygulama komutlarını kullan",
    REQUEST_TO_SPEAK: "Konuşma isteği gönder",
    MANAGE_EVENTS: "Etkinlikleri yönet",
    MANAGE_THREADS: "Alt başlıkları yönet",
    CREATE_PUBLIC_THREADS: "Herkese açık alt başlık aç",
    CREATE_PRIVATE_THREADS: "Özel alt başlık aç",
    USE_EXTERNAL_STICKERS: "Harici çıkartma kullan",
    SEND_MESSAGES_IN_THREADS: "Alt başlıkta mesaj gönder",
    USE_EMBEDDED_ACTIVITIES: "Etkinlik başlat",
    MODERATE_MEMBERS: "Üyelere zaman aşımı uygula",
    VIEW_CREATOR_MONETIZATION_ANALYTICS: "Gelir içgörülerini gör",
    USE_SOUNDBOARD: "Ses panosunu kullan",
    USE_EXTERNAL_SOUNDS: "Harici sesleri kullan",
    SEND_VOICE_MESSAGES: "Sesli mesaj gönder",
    SEND_POLLS: "Anket oluştur",
    USE_EXTERNAL_APPS: "Harici uygulamaları kullan",
    PIN_MESSAGES: "Mesaj sabitle",
    BYPASS_SLOWMODE: "Yavaş modu atla"
};

export function permissionLabel(key: string): string {
    return PERMISSION_LABELS[key]
        ?? key.toLowerCase().split("_").map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

/** Bir bit alanındaki açık izinlerin anahtarları (tanım sırasıyla). */
export function listPermissions(bits: bigint, all: Record<string, bigint>): string[] {
    return Object.entries(all)
        .filter(([, bit]) => typeof bit === "bigint" && bit !== 0n && (bits & bit) === bit)
        .map(([key]) => key);
}

export interface RoleLike {
    id: string;
    name: string;
    permissions: bigint;
    color?: number;
    colorString?: string | null;
    position?: number;
}

export interface OverwriteLike {
    id: string;
    /** 0 = rol, 1 = üye */
    type: number;
    allow: bigint;
    deny: bigint;
}

const ADMINISTRATOR = 1n << 3n;

/**
 * Yalnızca `role` (+ herkes) rolüne sahip bir üye kanalda `bit` iznine sahip mi?
 * Discord'un izin hesabı: temel izinler → @everyone üzerine yazma → rol üzerine yazma.
 */
export function roleHasChannelPermission(
    guildId: string,
    role: RoleLike,
    everyone: RoleLike | undefined,
    overwrites: Record<string, OverwriteLike> | undefined,
    bit: bigint
): boolean {
    let perms = BigInt(role.permissions ?? 0n) | BigInt(everyone?.permissions ?? 0n);
    if ((perms & ADMINISTRATOR) === ADMINISTRATOR) return true;

    const apply = (overwrite: OverwriteLike | undefined) => {
        if (!overwrite) return;
        perms &= ~BigInt(overwrite.deny ?? 0n);
        perms |= BigInt(overwrite.allow ?? 0n);
    };

    apply(overwrites?.[guildId]);
    if (role.id !== guildId) apply(overwrites?.[role.id]);
    return (perms & bit) === bit;
}

/**
 * Kanalı (bit iznini) hangi roller görebilir.
 * `everyone: true` ise herkes görebilir, rol listesi anlamsız.
 */
export function rolesWithChannelPermission(
    guildId: string,
    roles: RoleLike[],
    overwrites: Record<string, OverwriteLike> | undefined,
    bit: bigint
): { everyone: boolean; roles: RoleLike[] } {
    const everyoneRole = roles.find(role => role.id === guildId);
    if (everyoneRole && roleHasChannelPermission(guildId, everyoneRole, everyoneRole, overwrites, bit)) {
        return { everyone: true, roles: [] };
    }

    return {
        everyone: false,
        roles: roles
            .filter(role => role.id !== guildId)
            .filter(role => roleHasChannelPermission(guildId, role, everyoneRole, overwrites, bit))
            .sort((a, b) => (b.position ?? 0) - (a.position ?? 0))
    };
}
