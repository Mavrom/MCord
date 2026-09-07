/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

export interface VersionInfo {
    version: string;
    commitHash: string;
    buildTimestamp: number;
    electronVersion: string;
    chromeVersion: string;
}

export interface InjectionState {
    currentVersion: string;
    latestVersion: string;
    isOutdated: boolean;
    canRepatch: boolean;
}

/**
 * `contextBridge` üzerinden renderer'a açılan yüzey. Renderer'ın main process'e
 * erişebildiği tek kapı burasıdır — yüzeyi bilinçli olarak dar tutuyoruz.
 */
export interface PendingUpdate {
    version: string;
    sha256: string;
    size: number;
    stagedAt: number;
}

export interface McordNative {
    settings: {
        getSettingsDir(): string;
        get(): Record<string, unknown>;
        set(settings: unknown): Promise<void>;
        openFolder(): Promise<void>;
    };
    app: {
        getVersionInfo(): VersionInfo;
        relaunch(): Promise<void>;
        openExternal(url: string): Promise<void>;
    };
    net: {
        /**
         * Main process üzerinden HTTP isteği — renderer CSP'sine takılmaz.
         * Yalnızca plugin'lerin açıkça talep ettiği dış istekler için.
         */
        request(url: string, options?: {
            method?: string;
            headers?: Record<string, string>;
            body?: string;
        }): Promise<{ status: number; ok: boolean; text: string }>;
    };
    injection: {
        getState(): InjectionState | null;
        repatchLatest(): Promise<boolean>;
    };
    updater: {
        getPending(): PendingUpdate | null;
        /** İndirir ve SHA-256 ile doğrular; kapanışta uygulanır (plan §10.1). */
        download(url: string, sha256: string, version: string): Promise<PendingUpdate>;
        discard(): Promise<void>;
    };
}
