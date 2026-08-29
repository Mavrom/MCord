/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/**
 * `dist/` klasörünü `dist/app.asar` olarak paketler ve SHA-256 özetini yazar.
 *
 * Installer bu dosyayı Discord'un `resources/app.asar`'ı olarak kopyalar;
 * güncelleme akışı da aynı dosyayı indirip özetle doğrular (plan §10.1, §12).
 */

import { createHash } from "node:crypto";
import { cpSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { createPackage } from "@electron/asar";

import { DIST, PackageJson, ROOT } from "./build/common.mjs";

const STAGING = join(ROOT, ".asar-staging");
const OUTPUT = join(DIST, "app.asar");
const MANIFEST = join(DIST, "app.asar.json");

const FILES = ["patcher.js", "preload.js", "renderer.js", "package.json"];

rmSync(STAGING, { recursive: true, force: true });
mkdirSync(STAGING, { recursive: true });

for (const file of FILES) {
    const source = join(DIST, file);

    try {
        statSync(source);
    } catch {
        console.error(`[MCord] dist/${file} yok. Önce \`pnpm build\` çalıştır.`);
        process.exit(1);
    }

    cpSync(source, join(STAGING, file));
}

await createPackage(STAGING, OUTPUT);
rmSync(STAGING, { recursive: true, force: true });

const bytes = readFileSync(OUTPUT);
const sha256 = createHash("sha256").update(bytes).digest("hex");

const manifest = {
    version: PackageJson.version,
    size: bytes.byteLength,
    sha256
};

writeFileSync(MANIFEST, JSON.stringify(manifest, null, 4));

console.log(`[MCord] app.asar paketlendi — ${(bytes.byteLength / 1024).toFixed(1)} KB`);
console.log(`[MCord] sha256: ${sha256}`);
