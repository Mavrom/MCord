/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { recentPatchErrors } from "../../../patcher/functionPatcher";
import { SYM_PATCHED_BY } from "../../../webpack/codePatcher";
import { wreq } from "../../../webpack/intercept";

/**
 * Suçlu plugin tespiti (plan §8.2).
 *
 * BD stack trace'te plugin dosya URL'sini arıyor; bizim pluginlerimiz tek
 * bundle içinde olduğu için o yöntem çalışmaz. Bunun yerine **patch registry
 * üzerinden atıf** yapıyoruz — minify/inline edilmiş stack'lerde regex'ten
 * daha güvenilir.
 */

/** Kod patch'lenmiş modüller `//# sourceURL=file:///WebpackModule<id>` olarak görünüyor. */
const MODULE_URL_PATTERN = /WebpackModule(\w+)/g;

/** Fonksiyon patch'i hatası bu kadar süre içindeyse çökmeyle ilişkilendiriyoruz. */
const RECENT_WINDOW_MS = 10_000;

export interface Attribution {
    plugins: string[];
    /** Atıf nereden geldi — kullanıcıya gösteriliyor. */
    source: "function-patch" | "code-patch" | "unknown";
}

export function attributeCrash(error: unknown, componentStack?: string): Attribution {
    // 1. Fonksiyon patch'i: son hatalar tamponu (en güvenilir).
    const now = Date.now();
    const recent = recentPatchErrors.filter(entry => now - entry.at < RECENT_WINDOW_MS);

    if (recent.length > 0) {
        return {
            plugins: [...new Set(recent.map(entry => entry.caller))],
            source: "function-patch"
        };
    }

    // 2. Kod patch'i: stack'teki modül id'lerini `SYM_PATCHED_BY` ile eşle.
    const stack = [
        (error as Error | undefined)?.stack ?? "",
        componentStack ?? ""
    ].join("\n");

    const plugins = new Set<string>();

    for (const match of stack.matchAll(MODULE_URL_PATTERN)) {
        const moduleId = match[1];
        const factory = wreq?.m?.[moduleId as any];
        const patchedBy = (factory as any)?.[SYM_PATCHED_BY] as string[] | undefined;

        if (Array.isArray(patchedBy)) {
            for (const plugin of patchedBy) plugins.add(plugin);
        }
    }

    if (plugins.size > 0) {
        return { plugins: [...plugins], source: "code-patch" };
    }

    return { plugins: [], source: "unknown" };
}

/** GitHub issue URL'i için çeşitli git URL formatlarını normalize eder (plan §8.4). */
export function parseGithubUrl(url: string): string {
    return url
        .replace(/^git\+/, "")
        .replace(/^git:\/\//, "https://")
        .replace(/^git@([^:]+):/, "https://$1/")
        .replace(/\.git$/, "")
        .replace(/\/$/, "");
}
