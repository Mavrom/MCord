/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

export type BranchStatus = {
    id: "stable" | "ptb" | "canary";
    name: string;
    version: string;
    installed: boolean;
    otherMod: boolean;
    hasDevInjection: boolean;
    running: boolean;
};

export type Result<T> = { ok: true; data: T } | { ok: false; code: string; message: string };

type InstallData = { size: number; sha256: string };

type Core = {
    detectInstalls(): Promise<Result<BranchStatus[]>>;
    install(id: string): Promise<Result<InstallData>>;
    uninstall(id: string): Promise<Result<{ restored: boolean }>>;
    repair(id: string): Promise<Result<InstallData>>;
    closeDiscord(id: string): Promise<Result<Record<string, never>>>;
    launchDiscord(id: string): Promise<Result<Record<string, never>>>;
};

declare global {
    interface Window {
        core: Core;
        __mcordProgress?: (line: string) => void;
    }
}

// `webview.expose("core", …)` sayfa yüklenmeden önce window.core'u kurar; yine de
// çağrı anında oku ki yarış olursa anlaşılır hata dönsün.
export const core: Core = new Proxy({} as Core, {
    get: (_t, prop: string) => (...args: unknown[]) => {
        const bridge = window.core as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>;
        const fn = bridge?.[prop];
        if (typeof fn !== "function") {
            return Promise.resolve({ ok: false, code: "INTERNAL", message: `köprü hazır değil: core.${prop}` });
        }
        return fn(...args);
    }
});

export function onProgress(cb: (line: string) => void): void {
    window.__mcordProgress = cb;
}
