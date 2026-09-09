/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { execSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const SRC = join(ROOT, "src");
export const DIST = join(ROOT, "dist");

export const PackageJson = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"));

export const watch = process.argv.includes("--watch");
export const IS_DEV = watch || process.argv.includes("--dev");
export const IS_REPORTER = process.argv.includes("--reporter");

// Reporter build'i her zaman dev'dir: tüm patch'lerin denenmesi ve
// her hatanın görünmesi gerekiyor (plan §9.1).
export const IS_DEV_BUILD = IS_DEV || IS_REPORTER;

export const commitHash = (() => {
    try {
        return execSync("git rev-parse --short HEAD", { cwd: ROOT, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    } catch {
        return "unknown";
    }
})();

export const banner = {
    js: `
// MCord ${PackageJson.version}
// Copyright (c) 2026 Mavrom
// SPDX-License-Identifier: PolyForm-Strict-1.0.0
// https://github.com/Mavrom/MCord
`.trim()
};

/**
 * Plugin adı `definePlugin({ name: "..." })` çağrısından regex ile çıkarılır.
 * Eşleşmezse build patlar — plugin adı dosya sisteminde, runtime'da ve
 * ayarlarda kullanıldığı için tutarsızlık kabul edilemez (plan §6.1).
 */
const PluginDefinitionNameMatcher = /definePlugin\(\{\s*(["'])?name\1:\s*(["'`])(.+?)\2/;

export function getPluginName(fullPath, code) {
    const name = code.match(PluginDefinitionNameMatcher)?.[3];
    if (!name) {
        throw new Error(
            `Invalid plugin ${relative(ROOT, fullPath)}: must contain definePlugin call ` +
            "with simple string name property as first property"
        );
    }
    return name;
}

/**
 * `~plugins` sanal modülünü çözer.
 *
 * Hedef filtreleme (plan §6.2) — iki hedef var:
 *   plugin/index.ts       → her zaman
 *   plugin.dev/index.ts   → sadece dev build
 */
export const globPlugins = () => ({
    name: "glob-plugins",
    setup(build) {
        const filter = /^~plugins$/;

        build.onResolve({ filter }, args => ({
            namespace: "import-plugins",
            path: args.path
        }));

        build.onLoad({ filter, namespace: "import-plugins" }, async () => {
            const pluginDirs = ["plugins/_api", "plugins/_core", "plugins"];
            let code = "";
            let pluginsCode = "\n";
            let i = 0;

            for (const dir of pluginDirs) {
                const dirPath = join(SRC, dir);
                const files = readdirSync(dirPath, { withFileTypes: true });

                for (const file of files) {
                    const fileName = file.name;

                    // `_` ile başlayan klasörler ve index.ts taranmıyor (plan §6.1)
                    if (fileName.startsWith("_") || fileName === "index.ts") continue;
                    if (dir === "plugins" && file.isDirectory() && fileName.startsWith("_")) continue;

                    const target = getPluginTarget(fileName);
                    if (target === "dev" && !IS_DEV_BUILD) continue;
                    if (target && target !== "dev") continue;

                    const fullPath = join(dirPath, fileName) + (file.isDirectory() ? "/index.ts" : "");
                    const mod = `p${i}`;
                    code += `import ${mod} from "./${dir}/${fileName.replace(/\.tsx?$/, "")}";\n`;

                    const fileToRead = file.isDirectory()
                        ? findPluginEntry(join(dirPath, fileName))
                        : join(dirPath, fileName);

                    const pluginName = getPluginName(fullPath, await readFile(fileToRead, "utf-8"));
                    pluginsCode += `[${JSON.stringify(pluginName)}]:${mod},\n`;
                    i++;
                }
            }

            code += `export default {${pluginsCode}};`;
            return { contents: code, resolveDir: SRC };
        });
    }
});

function findPluginEntry(dirPath) {
    for (const candidate of ["index.ts", "index.tsx"]) {
        const p = join(dirPath, candidate);
        try {
            readFileSync(p);
            return p;
        } catch { /* dene */ }
    }
    throw new Error(`Plugin directory ${dirPath} has no index.ts / index.tsx`);
}

/** `MyPlugin.dev` → "dev", `MyPlugin` → null */
function getPluginTarget(fileName) {
    const pathParts = fileName.split(".");
    if (/^index/.test(pathParts.at(-1))) pathParts.pop();
    const identifier = pathParts.length > 1 ? pathParts.at(-1) : null;
    return identifier === "ts" || identifier === "tsx" ? null : identifier;
}

/** Node/Electron hedefleri için tüm paketleri external yapar. */
export const makeAllPackagesExternalPlugin = {
    name: "make-all-packages-external",
    setup(build) {
        const filter = /^[^./]|^\.[^./]|^\.\.[^/]/;
        build.onResolve({ filter }, args => {
            // Windows'ta giriş noktası mutlak yol (`C:\…`) filtreye takılıp
            // "entry point cannot be marked as external" hatası veriyordu.
            if (args.kind === "entry-point" || isAbsolute(args.path)) return null;
            return { path: args.path, external: true };
        });
    }
};

/**
 * Reporter yalnızca `--reporter` build'inde gerekli. Normal build'de gerçek
 * `debug/reporter` modülünü hafif stub'la değiştiriyoruz — böylece
 * `loadLazyChunks`, `tracer`, `p-limit` gibi ağır bağımlılıklar (ve ~15 KB ölü
 * kod) pakete hiç girmiyor.
 */
export const reporterStubPlugin = {
    name: "reporter-stub-plugin",
    setup(build) {
        if (IS_REPORTER) return;

        build.onResolve({ filter: /(^|\/)debug\/reporter$/ }, args => ({
            path: join(dirname(fileURLToPath(import.meta.url)), "..", "..", "src", "debug", "reporter.stub.ts")
        }));
    }
};

/** `file://` ile import edilen dosyaları base64 string olarak gömer. */
export const fileIncludePlugin = {
    name: "file-include-plugin",
    setup(build) {
        const filter = /^~fileContent\/.+$/;

        build.onResolve({ filter }, args => ({
            namespace: "include-file",
            path: args.path,
            pluginData: { resolveDir: args.resolveDir }
        }));

        build.onLoad({ filter, namespace: "include-file" }, async ({ path, pluginData }) => {
            const target = join(pluginData.resolveDir, path.slice("~fileContent/".length));
            return {
                contents: `export default ${JSON.stringify(await readFile(target, "utf-8"))};`
            };
        });
    }
};

export const defines = {
    IS_DEV: JSON.stringify(IS_DEV_BUILD),
    IS_REPORTER: JSON.stringify(IS_REPORTER),
    VERSION: JSON.stringify(PackageJson.version),
    BUILD_TIMESTAMP: JSON.stringify(Date.now()),
    COMMIT_HASH: JSON.stringify(commitHash)
};

/** Tüm hedeflerin paylaştığı esbuild seçenekleri. */
export const commonOpts = {
    logLevel: "info",
    bundle: true,
    minify: !IS_DEV_BUILD,
    sourcemap: IS_DEV_BUILD ? "inline" : false,
    legalComments: "linked",
    banner,
    plugins: [reporterStubPlugin, fileIncludePlugin],
    define: defines,
    // React'i biz bundle etmiyoruz; Discord'unkini webpack'ten çekiyoruz (plan §11.3)
    jsxFactory: "McordCreateElement",
    jsxFragment: "McordFragment"
};

export const nodeCommonOpts = {
    ...commonOpts,
    format: "cjs",
    platform: "node",
    target: ["esnext"],
    external: ["electron", "original-fs", "~pluginNatives", ...commonOpts.external ?? []],
    plugins: [makeAllPackagesExternalPlugin, ...commonOpts.plugins]
};
