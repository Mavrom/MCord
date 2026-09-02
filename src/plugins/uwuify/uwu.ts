/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

const FACES = ["(・`ω´・)", ";;w;;", "OwO", "UwU", ">w<", "^w^", "(ᵘ▽ᵘ)"];

/** Metni uwu diline çevirir. `seed` yerine index'e bağlı deterministik yüz. */
export function uwuify(input: string): string {
    let out = input
        .replace(/(?:r|l)/g, "w")
        .replace(/(?:R|L)/g, "W")
        .replace(/n([aeiou])/g, "ny$1")
        .replace(/N([aeiou])/g, "Ny$1")
        .replace(/N([AEIOU])/g, "NY$1")
        .replace(/ove/g, "uv");

    out = out.replace(/([.!?])\s+/g, (_m, p, i) => ` ${FACES[i % FACES.length]} `);
    return out;
}
