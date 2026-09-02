/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const src = (p: string) => fileURLToPath(new URL(`./src/${p}`, import.meta.url));

export default defineConfig({
    test: {
        include: ["src/**/*.test.ts", "scripts/installer/src/**/*.test.mjs"],
        passWithNoTests: true,
        environment: "node"
    },
    resolve: {
        alias: {
            "@utils": src("utils/index.ts"),
            "@webpack": src("webpack/index.ts"),
            "@patcher": src("patcher/index.ts"),
            "@api": src("api/index.ts")
        }
    }
});
