/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getStatus, installAsar, uninstallAsar } from "./install.mjs";

let root;
let install;

beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "mcord-asar-"));
    const resources = join(root, "resources");
    mkdirSync(resources, { recursive: true });
    install = {
        appAsar: join(resources, "app.asar"),
        backupAsar: join(resources, "_app.asar"),
        devAppDir: join(resources, "app")
    };
    writeFileSync(install.appAsar, "ORIJINAL DISCORD");
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

function source(content = "MCORD PAKETI") {
    const p = join(root, "src-app.asar");
    writeFileSync(p, content);
    return p;
}

describe("installAsar", () => {
    it("yedek oluşturur ve bizim asar'ı kopyalar", () => {
        const res = installAsar(install, source("MCORD"));
        expect(readFileSync(install.appAsar, "utf-8")).toBe("MCORD");
        expect(readFileSync(install.backupAsar, "utf-8")).toBe("ORIJINAL DISCORD");
        expect(res.size).toBe(5);
    });

    it("idempotent — ikinci çağrı yedeği bozmaz", () => {
        installAsar(install, source("MCORD-1"));
        installAsar(install, source("MCORD-2"));
        expect(readFileSync(install.appAsar, "utf-8")).toBe("MCORD-2");
        expect(readFileSync(install.backupAsar, "utf-8")).toBe("ORIJINAL DISCORD");
    });

    it("kaynak yoksa SOURCE_NOT_FOUND koduyla patlar", () => {
        expect(() => installAsar(install, join(root, "yok.asar")))
            .toThrowError(expect.objectContaining({ code: "SOURCE_NOT_FOUND" }));
    });
});

describe("uninstallAsar", () => {
    it("yedeği geri yükler", () => {
        installAsar(install, source("MCORD"));
        const res = uninstallAsar(install);
        expect(res.restored).toBe(true);
        expect(readFileSync(install.appAsar, "utf-8")).toBe("ORIJINAL DISCORD");
    });

    it("dev enjeksiyon klasörünü temizler", () => {
        mkdirSync(install.devAppDir, { recursive: true });
        writeFileSync(join(install.devAppDir, "patcher.js"), "x");
        uninstallAsar(install);
        expect(getStatus(install).hasDevInjection).toBe(false);
    });

    it("kurulu değilse restored:false", () => {
        expect(uninstallAsar(install).restored).toBe(false);
    });
});
