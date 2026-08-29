/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Logger } from "../utils/logger";

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
