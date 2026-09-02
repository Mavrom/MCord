/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/**
 * MCord'un `app.asar`'ı bundle'a base64 gömülü gelir (`build.mjs` üretir).
 * Kurulumdan önce geçici bir dosyaya yazılır; `installAsar` oradan kopyalar.
 */

import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { APP_ASAR_B64 } from "./payload.generated.mjs";

let cached = null;

export function materializeAsar() {
    if (cached && existsSync(cached)) return cached;
    const dir = mkdtempSync(join(tmpdir(), "mcord-src-"));
    const path = join(dir, "app.asar");
    writeFileSync(path, Buffer.from(APP_ASAR_B64, "base64"));
    cached = path;
    return path;
}
