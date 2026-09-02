/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { detectInstalls, install, uninstall } from "./index.mjs";

let root;
let deps;

beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "mcord-api-"));
    mkdirSync(join(root, "Discord", "app-1.0.0", "resources"), { recursive: true });
    writeFileSync(join(root, "Discord", "app-1.0.0", "resources", "app.asar"), "ORIJINAL");
    deps = { localAppData: root, platform: "win32", run: () => "INFO: No tasks are running." };
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe("detectInstalls", () => {
    it("Discord yoksa NO_DISCORD", () => {
        const res = detectInstalls({ ...deps, localAppData: join(root, "yok") });
        expect(res).toMatchObject({ ok: false, code: "NO_DISCORD" });
    });
    it("kurulu dalı durumuyla döner", () => {
        const res = detectInstalls(deps);
        expect(res.ok).toBe(true);
        expect(res.data[0]).toMatchObject({ id: "stable", installed: false, running: false });
    });
});

describe("install", () => {
    it("geçerli dalda kurar ve doğrular", () => {
        const src = join(root, "mcord.asar");
        writeFileSync(src, "MCORD");
        const res = install("stable", src, () => {}, deps);
        expect(res).toMatchObject({ ok: true });
        expect(res.data.size).toBe(5);
    });
    it("Discord açıksa DISCORD_RUNNING", () => {
        const src = join(root, "mcord.asar");
        writeFileSync(src, "MCORD");
        const running = { ...deps, run: () => "Discord.exe 1 Console 1 1 K" };
        expect(install("stable", src, () => {}, running)).toMatchObject({ ok: false, code: "DISCORD_RUNNING" });
    });
    it("bilinmeyen dal BRANCH_NOT_FOUND", () => {
        expect(install("ptb", "x", () => {}, deps)).toMatchObject({ ok: false, code: "BRANCH_NOT_FOUND" });
    });
});

describe("uninstall", () => {
    it("kurulu değilse NOT_INSTALLED", () => {
        expect(uninstall("stable", () => {}, deps)).toMatchObject({ ok: false, code: "NOT_INSTALLED" });
    });
});
