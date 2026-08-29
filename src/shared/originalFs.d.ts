/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/**
 * Electron `fs`'i asar dosyalarını klasör gibi gösterecek şekilde patch'liyor.
 * `original-fs` ham dosya sistemini verir — asar dosyalarını kopyalarken/taşırken
 * zorunlu (plan §3.6, §12.2).
 */
declare module "original-fs" {
    export * from "node:fs";
}
