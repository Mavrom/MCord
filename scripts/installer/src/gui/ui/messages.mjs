/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/** Hata kodu → kullanıcıya gösterilecek Türkçe metin. */

const TEXT = {
    NO_DISCORD: "Bilgisayarında Discord kurulumu bulunamadı.",
    BRANCH_NOT_FOUND: "Seçilen Discord dalı artık kurulu değil.",
    DISCORD_RUNNING: "Discord açık — devam etmeden önce kapatılmalı.",
    DISCORD_STILL_RUNNING: "Discord kapatılamadı. Elle kapatıp tekrar dene.",
    ASAR_NOT_FOUND: "Discord'un app.asar dosyası bulunamadı. Discord'u onar.",
    SOURCE_NOT_FOUND: "MCord paketi (app.asar) bulunamadı.",
    VERIFY_SIZE: "Kopyalama doğrulanamadı (boyut). Discord'u açma, tekrar dene.",
    VERIFY_SHA: "Kopyalama doğrulanamadı (SHA-256). Discord'u açma, tekrar dene.",
    NOT_INSTALLED: "MCord bu dalda kurulu değil.",
    INTERNAL: "Beklenmeyen bir hata oluştu."
};

export function errorText(code) {
    return TEXT[code] ?? TEXT.INTERNAL;
}
