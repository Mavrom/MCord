/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/**
 * Üç aşama:
 *   1. src/gui/ui → dist-ui/index.html  (React UI, tek dosya, CSS+JS gömülü)
 *      + src/gui/ui.generated.mjs  (HTML string olarak; hem dev hem bundle kullanır)
 *   2. dist/app.asar → src/core/payload.generated.mjs  (base64 gömülü)
 *   3. src/index.mjs → dist-installer/installer.cjs  (pkg'ın yiyeceği tek CJS dosya)
 *      `@webviewjs/webview` external kalır — native .node'u pkg require izinden bulur.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const UI = join(HERE, "src", "gui", "ui");
const UI_OUT = join(HERE, "dist-ui");
const BUNDLE_OUT = join(HERE, "dist-installer");

const LICENSE_HEADER =
    "/*\n" +
    " * MCord, a Discord client modification\n" +
    " * Copyright (c) 2026 Mavrom\n" +
    " * SPDX-License-Identifier: PolyForm-Strict-1.0.0\n" +
    " */\n\n" +
    "/* build.mjs tarafından üretildi — elle düzenleme. */\n\n";

mkdirSync(UI_OUT, { recursive: true });
mkdirSync(BUNDLE_OUT, { recursive: true });

// ── 1. UI ────────────────────────────────────────────────────────────────────

const ui = await build({
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
const js = ui.outputFiles[0].text;

const html = readFileSync(join(UI, "index.html"), "utf-8")
    .replace("__STYLE__", `<style>${css}</style>`)
    .replace("__SCRIPT__", `<script>${js}</script>`);

writeFileSync(join(UI_OUT, "index.html"), html);
writeFileSync(
    join(HERE, "src", "gui", "ui.generated.mjs"),
    LICENSE_HEADER + `export const UI_HTML = ${JSON.stringify(html)};\n`
);
console.log(`[MCord] UI paketlendi — ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB`);

// ── 2. app.asar payload ──────────────────────────────────────────────────────

const asarPath = join(REPO, "dist", "app.asar");
if (!existsSync(asarPath)) {
    console.error("[MCord] dist/app.asar yok — önce `pnpm dist` çalıştır.");
    process.exit(1);
}
const asarB64 = readFileSync(asarPath).toString("base64");
writeFileSync(
    join(HERE, "src", "core", "payload.generated.mjs"),
    LICENSE_HEADER + `export const APP_ASAR_B64 = ${JSON.stringify(asarB64)};\n`
);
console.log(`[MCord] app.asar gömüldü — ${(asarB64.length / 1024).toFixed(1)} KB (base64)`);

// ── 3. Installer bundle ──────────────────────────────────────────────────────

await build({
    entryPoints: [join(HERE, "src", "index.mjs")],
    bundle: true,
    platform: "node",
    format: "cjs",
    target: ["node22"],
    external: ["@webviewjs/webview"],
    outfile: join(BUNDLE_OUT, "installer.cjs"),
    logLevel: "info"
});
console.log("[MCord] installer.cjs paketlendi");
