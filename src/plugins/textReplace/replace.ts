/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

export interface Rule {
    find: string;
    replace: string;
    onlyIfIncludes?: string;
    isRegex?: boolean;
}

/** Kod bloklarını ve satır içi kodu ayırır. */
const CODE_SEGMENT = /(```[\s\S]*?```|`[^`\n]*`)/g;

/** Saf dönüşüm — birim testi bunun üzerinde (bkz. `replace.test.ts`). */
export function applyRules(content: string, rules: Rule[], skipCodeBlocks: boolean): string {
    if (rules.length === 0) return content;

    const transform = (text: string) =>
        rules.reduce((current, rule) => applyRule(current, rule), text);

    if (!skipCodeBlocks) return transform(content);

    return content
        .split(CODE_SEGMENT)
        .map(segment => (isCodeSegment(segment) ? segment : transform(segment)))
        .join("");
}

function isCodeSegment(segment: string): boolean {
    return segment.startsWith("`") && segment.endsWith("`") && segment.length > 1;
}

function applyRule(text: string, rule: Rule): string {
    if (!rule.find) return text;
    if (rule.onlyIfIncludes && !text.includes(rule.onlyIfIncludes)) return text;

    try {
        if (rule.isRegex) {
            return text.replace(new RegExp(rule.find, "g"), rule.replace);
        }
        return text.replaceAll(rule.find, rule.replace);
    } catch {
        // Bozuk regex metni bozmasın; ayar doğrulaması zaten uyarıyor.
        return text;
    }
}

/** Ayar dizesini doğrular — `isValid` bunu kullanıyor. */
export function validateRules(json: string): true | string {
    try {
        const parsed = JSON.parse(json);
        if (!Array.isArray(parsed)) return "Kök öğe bir dizi olmalı.";

        for (const rule of parsed) {
            if (typeof rule?.find !== "string" || typeof rule?.replace !== "string") {
                return "Her kuralda `find` ve `replace` string olmalı.";
            }
            if (rule.isRegex) new RegExp(rule.find);
        }

        return true;
    } catch (err) {
        return `Geçersiz JSON veya regex: ${String(err)}`;
    }
}
