/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

const FW_OFFSET = 0xFEE0;

/** ASCII → tam genişlik (ａｅｓｔｈｅｔｉｃ). */
export function fullwidth(input: string): string {
    return input.replace(/[!-~]/g, ch => String.fromCharCode(ch.charCodeAt(0) + FW_OFFSET))
        .replace(/ /g, "\u3000");
}

/** Kelimeler arasına emoji koyar. */
export function interleave(input: string, sep: string): string {
    const words = input.split(/\s+/).filter(Boolean);
    return words.length ? `${sep} ${words.join(` ${sep} `)} ${sep}` : input;
}

/** Harf aralı: m e r h a b a */
export function spaced(input: string): string {
    return [...input].join(" ");
}

export function reverse(input: string): string {
    return [...input].reverse().join("");
}
