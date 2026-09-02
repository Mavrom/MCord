/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/** MCord'un `app.asar`'ını bul: exe yanında (pkg) veya repo `dist/` (kaynak). */

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

export function resolveSourceAsar(fromDir) {
    const candidates = [
        join(fromDir, "app.asar"),
        join(dirname(process.execPath), "app.asar"),
        // scripts/installer/src/{core|gui} → repo kökü → dist/
        join(fromDir, "..", "..", "..", "..", "dist", "app.asar"),
        join(fromDir, "..", "..", "..", "dist", "app.asar")
    ];
    for (const c of candidates) {
        if (existsSync(c)) return c;
    }
    const e = new Error("app.asar bulunamadı. Kaynaktan çalıştırıyorsan `pnpm dist` çalıştır.");
    e.code = "SOURCE_NOT_FOUND";
    throw e;
}
