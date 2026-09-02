/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/**
 * `@webviewjs/webview` YÜKLENMEDEN ÖNCE çağrılmalı (`index.mjs` çağırır, sonra
 * `gui/main.mjs`'i import eder).
 *
 * Native `.node` bundle'a base64 gömülü; temp'e yazıp
 * `NAPI_RS_NATIVE_LIBRARY_PATH` ile napi-rs loader'ına gösteriyoruz. Böylece
 * pkg'ın asset çözümüne veya pnpm node_modules layout'una hiç güvenmiyoruz
 * ("Cannot find native binding" hatasının kaynağı buydu).
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { WEBVIEW_NODE_B64 } from "./webview-native.generated.mjs";

export function setupWebviewNative() {
    try {
        const dir = join(tmpdir(), "mcord-webview-bin");
        const file = join(dir, "webview.win32-x64-msvc.node");
        if (!existsSync(file)) {
            mkdirSync(dir, { recursive: true });
            writeFileSync(file, Buffer.from(WEBVIEW_NODE_B64, "base64"));
        }
        process.env.NAPI_RS_NATIVE_LIBRARY_PATH = file;
    } catch {
        // Yazılamadıysa @webviewjs kendi yolunu dener; olmazsa GUI fallback'e düşer.
    }
}
