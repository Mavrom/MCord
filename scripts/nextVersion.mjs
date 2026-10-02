/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/**
 * Otomatik yayının sürümünü hesaplar ve stdout'a yazar (`v` öneki olmadan).
 *
 *   - Son `v*` etiketinin patch'i bir artırılır (0.2.3 → 0.2.4).
 *   - package.json'daki sürüm bundan büyükse o kullanılır — minor/major
 *     atlamak için package.json'u elle yükseltmek yeterli.
 *
 * Kullanım: node scripts/nextVersion.mjs [--set]
 *   --set  hesaplanan sürümü kök ve installer package.json'larına yazar
 *          (yalnız CI'da; VERSION sabiti build'de buradan okunuyor).
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const PACKAGES = ["package.json", "scripts/installer/package.json"];

function parse(version) {
    const m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(version.trim());
    return m ? m.slice(1, 4).map(Number) : null;
}

function compare(a, b) {
    for (let i = 0; i < 3; i++) {
        if (a[i] !== b[i]) return a[i] - b[i];
    }
    return 0;
}

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const base = parse(pkg.version);
if (!base) throw new Error(`package.json sürümü geçersiz: ${pkg.version}`);

const tags = execFileSync("git", ["tag", "--list", "v*"], { encoding: "utf8" })
    .split("\n")
    .map(parse)
    .filter(Boolean)
    .sort(compare);

const latest = tags.at(-1);
const bumped = latest ? [latest[0], latest[1], latest[2] + 1] : base;
const next = (compare(base, bumped) > 0 ? base : bumped).join(".");

if (process.argv.includes("--set")) {
    for (const file of PACKAGES) {
        const json = JSON.parse(readFileSync(file, "utf8"));
        json.version = next;
        writeFileSync(file, JSON.stringify(json, null, 4) + "\n");
    }
}

process.stdout.write(next);
