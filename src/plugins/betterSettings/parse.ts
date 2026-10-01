/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/** Virgülle ayrılmış bölüm listesini normalize eder. Saf fonksiyon. */
export function parseHidden(value: string): Set<string> {
    return new Set(
        value
            .split(",")
            .map(part => part.trim().toLowerCase())
            .filter(Boolean)
    );
}

/**
 * Hiç gizlenmeyen düğümler. Ayar penceresi hedef verilmeden açılınca Discord
 * `account_panel`'e düşüyor (`defaultTarget`); o yolu kaldırırsak açılışta
 * gidilecek panel kalmaz.
 */
const PROTECTED_KEYS = new Set(["user_section", "account_sidebar_item", "account_panel"]);

/**
 * Kısa adın genişletildiği son ekler: `nitro` → `nitro_section` /
 * `nitro_sidebar_item`. Panel ve kategori düğümleri bilerek yok — onları
 * kaldırmak kenar çubuğu öğesini panelsiz bırakır.
 */
const SHORT_NAME_SUFFIXES = ["_section", "_sidebar_item"];

/**
 * Ayar ağacındaki bir düğüm anahtarı (ör. `billing_section`,
 * `nitro_sidebar_item`) gizlenecekler listesinde mi. Saf fonksiyon.
 *
 * Kullanıcı tam anahtarı da (`gift_sidebar_item`) kısa adı da (`gift`)
 * yazabilir.
 */
export function isHiddenKey(key: unknown, hidden: ReadonlySet<string>): boolean {
    if (typeof key !== "string" || hidden.size === 0) return false;

    const normalized = key.toLowerCase();
    if (PROTECTED_KEYS.has(normalized)) return false;
    if (hidden.has(normalized)) return true;

    return SHORT_NAME_SUFFIXES.some(suffix =>
        normalized.endsWith(suffix) && hidden.has(normalized.slice(0, -suffix.length)));
}
