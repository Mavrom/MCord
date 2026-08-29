/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/** Windows 11 pencere arka plan materyali (plan §3.3). */
export type WindowsMaterial = "none" | "mica" | "acrylic" | "tabbed";

/**
 * `settings.json`'ın main process tarafından okunan bölümü.
 * Renderer tarafı aynı dosyayı okur; burası sadece pencere/başlangıç ayarları.
 */
export interface MainSettings {
    /** Pencere çerçevesini tamamen kaldır. */
    frameless: boolean;
    /** Windows'un yerel başlık çubuğunu kullan (Discord'unki yerine). */
    winNativeTitleBar: boolean;
    /** Discord'un dayattığı minimum pencere boyutunu kaldır. */
    disableMinSize: boolean;
    /** Şeffaf pencere. */
    transparent: boolean;
    /** mica / acrylic / tabbed — "none" ile kapalı. */
    windowsMaterial: WindowsMaterial;
    /**
     * Arka plan boşaltmayı (throttling) kapat.
     * Varsayılan açık: donma şikayeti pil şikayetinden daha yaygın (plan §3.4).
     */
    disableBackgroundThrottling: boolean;
    /** DevTools'u etkinleştir (plan §3.5). */
    enableDevTools: boolean;
}

export const DefaultMainSettings: MainSettings = {
    frameless: false,
    winNativeTitleBar: false,
    disableMinSize: false,
    transparent: false,
    windowsMaterial: "none",
    disableBackgroundThrottling: true,
    enableDevTools: true
};
