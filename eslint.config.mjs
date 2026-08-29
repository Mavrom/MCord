/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import stylistic from "@stylistic/eslint-plugin";
import header from "eslint-plugin-simple-header";
import importSort from "eslint-plugin-simple-import-sort";
import unusedImports from "eslint-plugin-unused-imports";
import tseslint from "typescript-eslint";

import mcord from "./scripts/eslint/requirePatchReason.mjs";

export default tseslint.config(
    {
        ignores: ["dist/**", "node_modules/**", "browser/**"]
    },
    {
        files: ["src/**/*.{ts,tsx,mts,mjs,js,jsx}", "scripts/**/*.{ts,mjs,js}", "eslint.config.mjs"],
        plugins: {
            "simple-header": header,
            "simple-import-sort": importSort,
            "unused-imports": unusedImports,
            "@stylistic": stylistic,
            "@typescript-eslint": tseslint.plugin,
            mcord
        },
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                ecmaVersion: "latest",
                sourceType: "module",
                ecmaFeatures: { jsx: true }
            }
        },
        rules: {
            // Her dosyada telif başlığı zorunlu.
            "simple-header/header": ["error", {
                files: ["scripts/header.txt"],
                templates: {
                    year: ["\\d{4}", "2026"],
                    author: [".+", "Mavrom"]
                }
            }],

            // Kod patch'lerinde gerekçe zorunlu (plan §5.1)
            "mcord/require-patch-reason": "error",

            "simple-import-sort/imports": "error",
            "simple-import-sort/exports": "error",
            "unused-imports/no-unused-imports": "error",

            "@stylistic/indent": ["error", 4, { SwitchCase: 1, flatTernaryExpressions: true }],
            "@stylistic/quotes": ["error", "double", { avoidEscape: true }],
            "@stylistic/semi": ["error", "always"],
            "@stylistic/comma-dangle": ["error", "never"],
            "@stylistic/eol-last": ["error", "always"],
            "@stylistic/no-trailing-spaces": "error",
            "@stylistic/space-infix-ops": "error",
            "@stylistic/arrow-spacing": "error",
            "@stylistic/keyword-spacing": "error",
            "@stylistic/object-curly-spacing": ["error", "always"],
            "@stylistic/spaced-comment": ["error", "always", { markers: ["!", "#__PURE__"] }],

            "@typescript-eslint/no-unused-vars": ["error", {
                args: "none",
                varsIgnorePattern: "^_",
                caughtErrors: "none"
            }],
            "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-non-null-assertion": "off",
            "@typescript-eslint/ban-ts-comment": "off",

            eqeqeq: ["error", "always", { null: "ignore" }],
            "no-constant-condition": ["error", { checkLoops: false }],
            "no-invalid-regexp": "error",
            "no-fallthrough": "error",
            "prefer-const": ["error", { destructuring: "all" }],
            "no-var": "error",
            yoda: "error"
        }
    },
    {
        // Global tip bildirimlerinde `import()` annotation'ı zorunlu.
        files: ["**/*.d.ts"],
        rules: {
            "@typescript-eslint/consistent-type-imports": "off"
        }
    }
);
