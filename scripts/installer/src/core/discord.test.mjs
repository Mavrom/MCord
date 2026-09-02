/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { discoverInstalls, isRunning, launchDiscord } from "./discord.mjs";

let root;

beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "mcord-inst-"));
});
afterEach(() => {
    rmSync(root, { recursive: true, force: true });
});

function makeBranch(dir, versions) {
    for (const v of versions) {
        mkdirSync(join(root, dir, `app-${v}`, "resources"), { recursive: true });
    }
}

describe("discoverInstalls", () => {
    it("Discord yoksa boş dizi döner", () => {
        expect(discoverInstalls({ localAppData: root })).toEqual([]);
    });

    it("her dalın en yeni sürümünü seçer (sayısal karşılaştırma)", () => {
        makeBranch("Discord", ["1.0.9", "1.0.10", "1.0.2"]);
        const found = discoverInstalls({ localAppData: root });
        expect(found).toHaveLength(1);
        expect(found[0].id).toBe("stable");
        expect(found[0].version).toBe("app-1.0.10");
    });

    it("birden fazla dalı ayrı ayrı bulur", () => {
        makeBranch("Discord", ["1.0.1"]);
        makeBranch("DiscordCanary", ["1.0.5"]);
        const ids = discoverInstalls({ localAppData: root }).map(i => i.id).sort();
        expect(ids).toEqual(["canary", "stable"]);
    });
});

describe("isRunning", () => {
    it("tasklist çıktısında exe adı varsa true", () => {
        const run = () => "Discord.exe   1234 Console   1   120,000 K";
        expect(isRunning("Discord.exe", { run })).toBe(true);
    });
    it("çıktı boşsa false", () => {
        const run = () => "INFO: No tasks are running.";
        expect(isRunning("Discord.exe", { run })).toBe(false);
    });
    it("run patlarsa false", () => {
        const run = () => { throw new Error("boom"); };
        expect(isRunning("Discord.exe", { run })).toBe(false);
    });
});

describe("launchDiscord", () => {
    it("Update.exe varsa Squirrel launcher'ı ayrık başlatır", () => {
        const dir = mkdtempSync(join(tmpdir(), "mcord-launch-"));
        const updateExe = join(dir, "Update.exe");
        writeFileSync(updateExe, "");
        const calls = [];
        const spawnFn = (file, args, opts) => {
            calls.push({ file, args, opts });
            return { on() {}, unref() {} };
        };
        const ok = launchDiscord(
            { updateExe, appExe: join(dir, "app-1", "Discord.exe"), exe: "Discord.exe" },
            { spawnFn }
        );
        rmSync(dir, { recursive: true, force: true });
        expect(ok).toBe(true);
        expect(calls[0].file).toBe(updateExe);
        expect(calls[0].args).toEqual(["--processStart", "Discord.exe"]);
        expect(calls[0].opts).toMatchObject({ detached: true, stdio: "ignore" });
    });

    it("hiçbir exe yoksa false", () => {
        const ok = launchDiscord(
            { updateExe: "/yok/Update.exe", appExe: "/yok/Discord.exe", exe: "Discord.exe" },
            { spawnFn: () => { throw new Error("olmamalı"); } }
        );
        expect(ok).toBe(false);
    });
});
