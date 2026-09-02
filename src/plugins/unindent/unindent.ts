/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/**
 * Çok satırlı metinden ortak baştaki boşluğu (girinti) kaldırır.
 *
 * Kod bloklarının (``` … ```) içi olduğu gibi bırakılır — girinti orada
 * anlamlı. Boş satırlar ortak girinti hesabında sayılmaz.
 */
export function unindent(text: string): string {
    const segments = text.split(/(```[\s\S]*?```)/g);

    return segments
        .map((segment, i) => (i % 2 === 1 ? segment : unindentPlain(segment)))
        .join("");
}

function unindentPlain(text: string): string {
    const lines = text.split("\n");

    const indents = lines
        .filter(line => line.trim().length > 0)
        .map(line => /^\s*/.exec(line)![0].length);

    if (!indents.length) return text;

    const common = Math.min(...indents);
    if (common === 0) return text;

    return lines.map(line => line.slice(common)).join("\n");
}
