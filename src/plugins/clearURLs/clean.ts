/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { GLOBAL_PARAMS, GLOBAL_PREFIXES, HOST_RULES } from "./defaultRules";

/** URL benzeri parçaları yakalar (kod bloğu ayıklaması çağıran tarafta). */
const URL_REGEX = /https?:\/\/[^\s<>()[\]{}"']+/g;

function hostRulesFor(hostname: string): Set<string> {
    const host = hostname.toLowerCase().replace(/^www\./, "");
    const params = new Set<string>();

    for (const suffix in HOST_RULES) {
        if (host === suffix || host.endsWith(`.${suffix}`)) {
            for (const param of HOST_RULES[suffix]) params.add(param);
        }
    }
    return params;
}

function shouldStrip(key: string, hostParams: Set<string>): boolean {
    const lower = key.toLowerCase();
    if (GLOBAL_PARAMS.has(key) || GLOBAL_PARAMS.has(lower)) return true;
    if (GLOBAL_PREFIXES.some(prefix => lower.startsWith(prefix))) return true;
    if (hostParams.has(key) || hostParams.has(lower)) return true;
    return false;
}

/**
 * Tek bir URL string'inden izleme parametrelerini çıkarır.
 *
 * Ayrıştırılamayan (geçersiz) URL'ler olduğu gibi döner. Hiçbir parametre
 * silinmezse orijinal string döner — böylece `?a=1` → `?a=1` (yeniden
 * serileştirme kaynaklı gürültü yok).
 */
export function cleanUrl(raw: string): string {
    let url: URL;
    try {
        url = new URL(raw);
    } catch {
        return raw;
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") return raw;
    if (![...url.searchParams].length) return raw;

    const hostParams = hostRulesFor(url.hostname);
    let changed = false;

    for (const key of [...url.searchParams.keys()]) {
        if (shouldStrip(key, hostParams)) {
            url.searchParams.delete(key);
            changed = true;
        }
    }

    if (!changed) return raw;

    let result = url.origin + url.pathname;
    const query = url.searchParams.toString();
    if (query) result += `?${query}`;
    if (url.hash) result += url.hash;

    // Sondaki gereksiz `?` ve `/` (kök yol) korunuyor: orijinali bozmamak için
    // yalnızca parametre farkını uyguluyoruz.
    if (raw.endsWith("/") && !result.endsWith("/") && !url.searchParams.toString() && !url.hash) {
        result += "/";
    }

    return result;
}

/** Metindeki tüm URL'leri temizler. `skip` aralıkları (kod blokları) atlanır. */
export function cleanText(content: string, skipRanges: Array<[number, number]> = []): string {
    return content.replace(URL_REGEX, (match, offset: number) => {
        for (const [start, end] of skipRanges) {
            if (offset >= start && offset < end) return match;
        }
        return cleanUrl(match);
    });
}

/** ``` ve `` `` `` kod bloğu / satır içi kod aralıkları. */
export function codeRanges(content: string): Array<[number, number]> {
    const ranges: Array<[number, number]> = [];
    const regex = /```[\s\S]*?```|`[^`\n]*`/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
        ranges.push([match.index, match.index + match[0].length]);
    }
    return ranges;
}
