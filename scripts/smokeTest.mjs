/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/**
 * Main process duman testi.
 *
 * `dist/patcher.js`'i sahte bir Electron ortamında yükler ve **en kritik
 * garantiyi** doğrular: MCord ne yaparsa yapsın, orijinal Discord açılmalı
 * (plan §5.6 ilkesi).
 *
 * İki enjeksiyon düzeni de test edilir:
 *   A — dev inject  : bizimki `resources/app/`,     orijinal `resources/app.asar`
 *   B — installer   : bizimki `resources/app.asar`, orijinal `resources/_app.asar`
 *   C — bozuk kurulum: orijinal asar hiç yok → net hata, sessiz ölüm değil
 */

import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { DIST, ROOT } from "./build/common.mjs";

const root = mkdtempSync(join(tmpdir(), "mcord-smoke-"));
let failures = 0;

try {
    writeStubs(root);

    // ── Senaryo A ────────────────────────────────────────────────────────────
    {
        const res = join(root, "A", "app-1.0.9999", "resources");
        mkdirSync(join(res, "app"), { recursive: true });
        writeFakeDiscord(join(res, "app.asar"));
        copyDist(join(res, "app"));
        check("A (dev inject)", root, join(res, "app", "patcher.js"), join(root, "A"), true);
    }

    // ── Senaryo B ────────────────────────────────────────────────────────────
    {
        const res = join(root, "B", "app-1.0.9999", "resources");
        mkdirSync(join(res, "app.asar"), { recursive: true });
        writeFakeDiscord(join(res, "_app.asar"));
        copyDist(join(res, "app.asar"));
        check("B (installer)", root, join(res, "app.asar", "patcher.js"), join(root, "B"), true);
    }

    // ── Senaryo C — orijinal asar yok ────────────────────────────────────────
    {
        const res = join(root, "C", "app-1.0.9999", "resources");
        mkdirSync(join(res, "app.asar"), { recursive: true });
        copyDist(join(res, "app.asar"));
        check("C (bozuk kurulum)", root, join(res, "app.asar", "patcher.js"), join(root, "C"), false);
    }
} finally {
    rmSync(root, { recursive: true, force: true });
}

if (failures > 0) {
    console.error(`\n[MCord] duman testi BAŞARISIZ — ${failures} senaryo`);
    process.exit(1);
}
console.log("\n[MCord] duman testi geçti ✓");

// ─────────────────────────────────────────────────────────────────────────────

function copyDist(target) {
    for (const file of ["patcher.js", "package.json"]) {
        cpSync(join(DIST, file), join(target, file));
    }
}

function writeFakeDiscord(dir) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "package.json"),
        JSON.stringify({ name: "discord", main: "index.js", version: "1.0.9999" }));
    writeFileSync(join(dir, "index.js"), "global.__DISCORD_BOOTED = true;\n");
}

function check(label, root, entry, execRoot, expectBoot) {
    const out = execFileSync(process.execPath, [join(root, "runner.mjs"), entry, execRoot], {
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "pipe"]
    });

    const booted = out.includes("BOOTED=true");
    const ok = booted === expectBoot;

    console.log(`  ${ok ? "✓" : "✗"} ${label} — Discord açıldı: ${booted}` +
        (expectBoot ? "" : " (beklenen: açılmaması, net hata vermesi)"));

    if (!ok) failures++;
    if (!expectBoot && !out.includes("app.asar bulunamadı")) {
        console.log("    ✗ net hata mesajı yok");
        failures++;
    }
}

function writeStubs(root) {
    const nm = join(root, "node_modules");

    mkdirSync(join(nm, "electron"), { recursive: true });
    writeFileSync(join(nm, "electron", "package.json"),
        JSON.stringify({ name: "electron", main: "index.js", version: "38.0.0" }));
    writeFileSync(join(nm, "electron", "index.js"), `
class BrowserWindow {
    constructor(options) { this.options = options; }
    setMinimumSize() {}
    static getAllWindows() { return []; }
    static fromWebContents() { return null; }
}
module.exports = {
    app: {
        on: () => {}, getPath: () => "${join(root, "userdata").replaceAll("\\\\", "/")}",
        setAppPath: () => {},
        commandLine: { appendSwitch: () => {} },
        relaunch() {}, exit() {}
    },
    BrowserWindow,
    ipcMain: { on: () => {}, handle: () => {} },
    shell: { openExternal: async () => {}, showItemInFolder: () => {} },
    contextBridge: { exposeInMainWorld: () => {} },
    ipcRenderer: { sendSync: () => null, invoke: async () => {} },
    webFrame: { executeJavaScript: () => {} }
};
`);

    mkdirSync(join(nm, "original-fs"), { recursive: true });
    writeFileSync(join(nm, "original-fs", "package.json"),
        JSON.stringify({ name: "original-fs", main: "index.js", version: "1.0.0" }));
    writeFileSync(join(nm, "original-fs", "index.js"), 'module.exports = require("fs");');

    writeFileSync(join(root, "runner.mjs"), `
import Module from "node:module";
import { dirname, join } from "node:path";

const [entry, execRoot] = process.argv.slice(2);

const m = new Module(entry, null);
m.filename = entry;
m.paths = Module._nodeModulePaths(dirname(entry));
Object.defineProperty(m, "path", { value: dirname(entry) });

const req = Module.createRequire(entry);
req.main = m;
globalThis.require = req;
process.mainModule = m;
Module._cache[entry] = m;
Object.defineProperty(process, "execPath", {
    value: join(execRoot, "app-1.0.9999", "Discord.exe"), configurable: true
});

try { m.load(entry); } catch (err) { console.log("LOAD_ERROR:", err.message); }
console.log("BOOTED=" + (globalThis.__DISCORD_BOOTED === true));
`);

    void ROOT;
}
