/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/** src/gui/ui → dist-ui/index.html (JS + CSS gömülü, harici istek yok). */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

const HERE = dirname(fileURLToPath(import.meta.url));
const UI = join(HERE, "src", "gui", "ui");
const OUT = join(HERE, "dist-ui");

mkdirSync(OUT, { recursive: true });

const result = await build({
    entryPoints: [join(UI, "main.tsx")],
    bundle: true,
    minify: true,
    format: "iife",
    target: ["chrome110"],
    jsx: "automatic",
    write: false,
    logLevel: "info"
});

const css = readFileSync(join(UI, "theme.css"), "utf-8");
const js = result.outputFiles[0].text;

const html = readFileSync(join(UI, "index.html"), "utf-8")
    .replace("__STYLE__", `<style>${css}</style>`)
    .replace("__SCRIPT__", `<script>${js}</script>`);

writeFileSync(join(OUT, "index.html"), html);
console.log(`[MCord] UI paketlendi — ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB`);
