/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/**
 * Dört aşama — hepsi exe'ye gömülür, pkg'ın dosya/asset çözümüne güvenilmez:
 *   1. src/gui/ui → dist-ui/index.html + src/gui/ui.generated.mjs (HTML string)
 *   2. dist/app.asar → src/core/payload.generated.mjs (base64)
 *   3. @webviewjs/webview native .node → src/gui/webview-native.generated.mjs (base64)
 *      runtime'da temp'e yazılıp NAPI_RS_NATIVE_LIBRARY_PATH ile yükletilir
 *   4. src/index.mjs → dist-installer/installer.cjs (esbuild CJS bundle)
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
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

// ── 3. webview native .node ──────────────────────────────────────────────────

const nodeFile = findNativeNode();
if (!nodeFile) {
    console.error("[MCord] webview.win32-x64-msvc.node bulunamadı — `pnpm install` çalıştır.");
    process.exit(1);
}
const nodeB64 = readFileSync(nodeFile).toString("base64");
writeFileSync(
    join(HERE, "src", "gui", "webview-native.generated.mjs"),
    LICENSE_HEADER + `export const WEBVIEW_NODE_B64 = ${JSON.stringify(nodeB64)};\n`
);
console.log(`[MCord] webview .node gömüldü — ${(nodeB64.length / 1024).toFixed(1)} KB (base64)`);

// ── 4. Installer bundle ──────────────────────────────────────────────────────

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

/**
 * `webview.win32-x64-msvc.node`'u bul — pnpm/npm layout'undan bağımsız.
 *   1. `@webviewjs/webview`'i installer'ın node_modules'ünden çöz, oradan da
 *      optionalDependency `-win32-x64-msvc`'yi çöz (napi-rs platform paketinin
 *      `main`'i doğrudan .node dosyası)
 *   2. repo kökü + installer altındaki `.pnpm` store'larını tara
 *   3. düz `node_modules/@webviewjs/...` yolunu dene
 */
function findNativeNode() {
    const FILE = "webview.win32-x64-msvc.node";
    const bases = [join(HERE, "build.mjs"), join(REPO, "package.json")];

    for (const base of bases) {
        try {
            const reqBase = createRequire(base);
            const webviewMain = reqBase.resolve("@webviewjs/webview");
            return createRequire(webviewMain).resolve("@webviewjs/webview-win32-x64-msvc");
        } catch { /* sıradaki */ }
    }

    for (const store of [join(REPO, "node_modules", ".pnpm"), join(HERE, "node_modules", ".pnpm")]) {
        try {
            for (const d of readdirSync(store)) {
                if (!d.startsWith("@webviewjs+webview-win32-x64-msvc@")) continue;
                const p = join(store, d, "node_modules", "@webviewjs", "webview-win32-x64-msvc", FILE);
                if (existsSync(p)) return p;
            }
        } catch { /* yok */ }
    }

    for (const nm of [join(HERE, "node_modules"), join(REPO, "node_modules")]) {
        const p = join(nm, "@webviewjs", "webview-win32-x64-msvc", FILE);
        if (existsSync(p)) return p;
    }
    return null;
}
