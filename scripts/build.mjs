/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import esbuild from "esbuild";

import {
    commonOpts,
    DIST,
    globPlugins,
    IS_DEV_BUILD,
    IS_REPORTER,
    nodeCommonOpts,
    PackageJson,
    ROOT,
    SRC,
    watch
} from "./build/common.mjs";

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

/**
 * Enjekte edilen asar'ın manifesti. Discord'un kendi loader'ı bu dosyanın
 * `main` alanına bakarak giriş noktamızı çalıştırır (plan §3.1).
 */
writeFileSync(join(DIST, "package.json"), JSON.stringify({
    name: "mcord",
    main: "patcher.js",
    version: PackageJson.version
}, null, 4));

const tsconfig = join(ROOT, "tsconfig.json");

/** @type {esbuild.BuildOptions[]} */
const buildConfigs = [
    // 1. Electron main process — asar yönlendirme + BrowserWindow patch
    {
        ...nodeCommonOpts,
        tsconfig,
        entryPoints: [join(SRC, "main", "index.ts")],
        outfile: join(DIST, "patcher.js"),
        footer: { js: "//# sourceURL=file:///McordPatcher\n" },
        define: {
            ...nodeCommonOpts.define,
            IS_MAIN: "true",
            IS_PRELOAD: "false",
            IS_RENDERER: "false"
        }
    },

    // 2. Preload — contextBridge + renderer enjeksiyonu
    {
        ...nodeCommonOpts,
        tsconfig,
        entryPoints: [join(SRC, "preload.ts")],
        outfile: join(DIST, "preload.js"),
        footer: { js: "//# sourceURL=file:///McordPreload\n" },
        define: {
            ...nodeCommonOpts.define,
            IS_MAIN: "false",
            IS_PRELOAD: "true",
            IS_RENDERER: "false"
        }
    },

    // 3. Renderer — webpack motoru, patcher, plugin sistemi, UI
    {
        ...commonOpts,
        tsconfig,
        entryPoints: [join(SRC, "renderer.ts")],
        outfile: join(DIST, "renderer.js"),
        format: "iife",
        globalName: "Mcord",
        target: ["esnext"],
        footer: { js: "//# sourceURL=file:///McordRenderer\n" },
        plugins: [globPlugins(), ...commonOpts.plugins],
        // JSX fabrikası Discord'un React'ini çalışma anında çözüyor (plan §11.3)
        inject: [join(SRC, "utils", "jsx.ts")],
        define: {
            ...commonOpts.define,
            IS_MAIN: "false",
            IS_PRELOAD: "false",
            IS_RENDERER: "true"
        }
    }
];

const label = `${IS_DEV_BUILD ? "dev" : "production"}${IS_REPORTER ? " + reporter" : ""}`;

if (watch) {
    const contexts = await Promise.all(buildConfigs.map(cfg => esbuild.context(cfg)));
    await Promise.all(contexts.map(ctx => ctx.watch()));
    console.log(`[MCord] watching (${label})`);
} else {
    const start = performance.now();
    await Promise.all(buildConfigs.map(cfg => esbuild.build(cfg)));
    console.log(`[MCord] built ${label} in ${Math.round(performance.now() - start)}ms`);
}
