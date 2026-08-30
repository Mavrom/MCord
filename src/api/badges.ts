/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Logger } from "../utils/logger";

const logger = new Logger("Api:Badges", "#f4b8e4");

/**
 * Profil rozetleri: kullanıcı profilindeki rozet satırına özel rozet eklemeyi
 * sağlar.
 *
 * Sadece **resim URL'li** rozet destekleniyor (Discord'un kendi `<img src=…>`
 * işaretlemesi kullanılıyor, ekstra render patch'i gerekmiyor). Rozet nesnesi
 * `getBadges()` çıktısına enjekte ediliyor; oradan Discord'un render zincirine
 * doğal yoldan akıyor.
 */

export type BadgePosition = "start" | "end";

export interface ProfileBadge {
    /** Benzersiz kimlik. Discord bunu `key` olarak kullanıyor — `mcord-` ön eki önerilir. */
    id: string;
    /** Fareyle üzerine gelince görünen ipucu metni. */
    description: string;
    /** Rozet resminin URL'i. */
    iconSrc: string;
    /** Tıklanınca gidilecek adres (Discord doğal olarak destekliyor). */
    link?: string;
    /** Rozet bu kullanıcıda gösterilsin mi. Verilmezse her kullanıcıda gösterilir. */
    shouldShow?(userId: string): boolean;
    /** Rozet satırının başına mı sonuna mı — varsayılan `"start"`. */
    position?: BadgePosition;
}

const badges = new Set<ProfileBadge>();

export function addProfileBadge(badge: ProfileBadge): void {
    badges.add(badge);
}

export function removeProfileBadge(badge: ProfileBadge): boolean {
    return badges.delete(badge);
}

/**
 * Patch'in çağırdığı giriş noktası. `profile` Discord'un profil nesnesi
 * (`profile.userId` var). Her zaman bir dizi döndürür (`getBadges()` sonucuna
 * `...` ile yayılıyor).
 */
export function getProfileBadges(profile: { userId?: string } | null | undefined): ProfileBadge[] {
    const userId = profile?.userId;
    if (userId == null) return [];

    const start: ProfileBadge[] = [];
    const end: ProfileBadge[] = [];

    for (const badge of badges) {
        try {
            if (badge.shouldShow && !badge.shouldShow(userId)) continue;
            (badge.position === "end" ? end : start).push(badge);
        } catch (err) {
            logger.error(`"${badge.id}" rozeti değerlendirilemedi:\n`, err);
        }
    }

    return [...start, ...end];
}
