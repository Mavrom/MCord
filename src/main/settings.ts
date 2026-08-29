/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { app } from "electron";

import { DefaultMainSettings, type MainSettings } from "../shared/settingsTypes";

/**
 * Ayarlar Discord'un userData klasörünün *kardeşine* yazılır; Discord kaldırılsa
 * bile ayarlar kalır (plan §7.2).
 *
 *   %AppData%\discord\  →  %AppData%\MCord\
 */
export const DATA_DIR = process.env.MCORD_DATA_DIR
    || join(app.getPath("userData"), "..", "MCord");

export const SETTINGS_DIR = join(DATA_DIR, "settings");
export const SETTINGS_FILE = join(SETTINGS_DIR, "settings.json");

process.env.MCORD_DATA_DIR = DATA_DIR;

// Açılışta patlamamalı: klasör oluşturulamazsa MCord ayarsız çalışır,
// ama Discord açılır (plan §5.6 ilkesi main process'e de uygulanıyor).
try {
    mkdirSync(SETTINGS_DIR, { recursive: true });
} catch (err) {
    console.error("[MCord] Ayar klasörü oluşturulamadı:", err);
}

/**
 * Ham ayar nesnesi. Renderer tarafı aynı dosyaya yazdığı için main tarafında
 * şema doğrulaması yapmıyoruz — sadece bildiğimiz alanları varsayılanlarla
 * birleştirip okuyoruz.
 */
export function readSettings(): Record<string, unknown> {
    if (!existsSync(SETTINGS_FILE)) return {};

    try {
        return JSON.parse(readFileSync(SETTINGS_FILE, "utf-8"));
    } catch (err) {
        console.error("[MCord] settings.json okunamadı, varsayılanlara dönülüyor:", err);
        return {};
    }
}

export function writeSettings(settings: unknown): void {
    try {
        mkdirSync(SETTINGS_DIR, { recursive: true });
        writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 4), "utf-8");
    } catch (err) {
        console.error("[MCord] settings.json yazılamadı:", err);
    }
}

/** Pencere/başlangıç ayarları — eksik alanlar varsayılanla tamamlanır. */
export function getMainSettings(): MainSettings {
    const raw = readSettings();
    const stored = (raw.main ?? {}) as Partial<MainSettings>;

    const merged = { ...DefaultMainSettings };
    for (const key of Object.keys(DefaultMainSettings) as (keyof MainSettings)[]) {
        const value = stored[key];
        if (value !== undefined && typeof value === typeof DefaultMainSettings[key]) {
            (merged as Record<string, unknown>)[key] = value;
        }
    }

    return merged;
}
