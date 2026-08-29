/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/** Virgülle ayrılmış bölüm listesini normalize eder. Saf fonksiyon. */
export function parseHidden(value: string): Set<string> {
    return new Set(
        value
            .split(",")
            .map(part => part.trim().toLowerCase())
            .filter(Boolean)
    );
}
