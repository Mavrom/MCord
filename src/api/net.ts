/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Logger } from "../utils/logger";
import { getDiscordToken } from "../webpack/auth";

const logger = new Logger("Api:Net", "#f4b8e4");

/**
 * Ağ yardımcıları.
 *
 * Ürün duruşu gereği MCord hiçbir kullanıcı verisini uzak sunucuya göndermiyor
 * (plan §0.3). Bu modül sadece plugin'lerin **açıkça** talep ettiği dış
 * isteklere ve güncelleme kontrolüne hizmet ediyor.
 */

export interface FetchJsonOptions extends RequestInit {
    /** Milisaniye — aşılırsa istek iptal edilir. */
    timeout?: number;
}

export async function fetchJson<T = unknown>(url: string, options: FetchJsonOptions = {}): Promise<T> {
    const { timeout = 15_000, ...init } = options;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, { ...init, signal: controller.signal });

        if (!response.ok) {
            throw new Error(`${url} → ${response.status} ${response.statusText}`);
        }

        return await response.json() as T;
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Main process üzerinden JSON çeker — renderer CSP'sine takılmaz.
 * Discord'un izin vermediği host'lara istek atması gereken plugin'ler için
 * (çeviri, sözlük vb.).
 */
export async function nativeFetchJson<T = unknown>(
    url: string,
    options?: { method?: string; headers?: Record<string, string>; body?: string }
): Promise<T> {
    const response = await window.McordNative.net.request(url, options);
    if (!response.ok) {
        throw new Error(`${url} → ${response.status}`);
    }
    return JSON.parse(response.text) as T;
}

/** Main process üzerinden ham metin çeker. */
export async function nativeFetchText(
    url: string,
    options?: { method?: string; headers?: Record<string, string>; body?: string }
): Promise<string> {
    const response = await window.McordNative.net.request(url, options);
    if (!response.ok) {
        throw new Error(`${url} → ${response.status}`);
    }
    return response.text;
}

/**
 * Discord API isteği — main process üzerinden (renderer CSP'sine ve kırılabilen
 * webpack RestAPI'sine takılmadan), oturum token'ıyla.
 *
 * `path` `/guilds/…` gibi API v9 yolu. `body` JSON string ya da `form` multipart
 * (dosya main'de base64'ten kuruluyor).
 */
export async function discordApi<T = any>(
    path: string,
    init: {
        method?: string;
        headers?: Record<string, string>;
        body?: unknown;
        form?: {
            fields?: Record<string, string>;
            file?: { name: string; type: string; base64: string };
        };
    } = {}
): Promise<{ status: number; ok: boolean; body: T | null }> {
    const token = getDiscordToken();
    if (!token) throw new Error("Oturum token'ı alınamadı");

    const isJson = init.body != null && init.form == null;
    const response = await window.McordNative.net.request(`https://discord.com/api/v9${path}`, {
        method: init.method ?? "POST",
        headers: {
            authorization: token,
            ...(isJson ? { "content-type": "application/json" } : {}),
            ...init.headers
        },
        body: isJson ? (typeof init.body === "string" ? init.body : JSON.stringify(init.body)) : undefined,
        form: init.form
    });

    let body: any = null;
    try {
        body = response.text ? JSON.parse(response.text) : null;
    } catch { /* JSON değil */ }

    return { status: response.status, ok: response.ok, body };
}

/** Harici bağlantıyı sistem tarayıcısında açar — main process üzerinden. */
export async function openExternal(url: string): Promise<void> {
    try {
        await window.McordNative.app.openExternal(url);
    } catch (err) {
        logger.error(`Bağlantı açılamadı: ${url}\n`, err);
    }
}

/** SHA-256 özeti — güncelleme doğrulaması için (plan §10.1, §13). */
export async function sha256(data: ArrayBuffer): Promise<string> {
    const digest = await crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(digest)]
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");
}
