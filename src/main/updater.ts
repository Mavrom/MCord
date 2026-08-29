/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";

import { app } from "electron";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "original-fs";

import { DATA_DIR } from "./settings";

/**
 * Mod güncellemesi (plan §10.1).
 *
 * Discord host güncellemesiyle karıştırma — o `persistAfterUpdate.ts`'te (§3.6).
 *
 * `original-fs` kullanılıyor: asar dosyalarını ham olarak kopyalamak zorundayız
 * (plan §3.6, §12.2).
 */

const UPDATE_DIR = join(DATA_DIR, "updates");
const STAGED_ASAR = join(UPDATE_DIR, "app.asar");
const STAGED_META = join(UPDATE_DIR, "pending.json");

export interface PendingUpdate {
    version: string;
    sha256: string;
    size: number;
    stagedAt: number;
}

export function getPendingUpdate(): PendingUpdate | null {
    if (!existsSync(STAGED_ASAR) || !existsSync(STAGED_META)) return null;

    try {
        return JSON.parse(readFileSync(STAGED_META, "utf-8")) as PendingUpdate;
    } catch {
        return null;
    }
}

/**
 * Yeni sürümü indirir ve **SHA-256 ile doğrular** (plan §10.1, §13 tedarik zinciri).
 * Doğrulama başarısızsa dosya silinir ve hata fırlatılır.
 */
export async function downloadUpdate(
    url: string,
    expectedSha256: string,
    version: string
): Promise<PendingUpdate> {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`İndirme başarısız: ${response.status} ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const actualSha256 = createHash("sha256").update(buffer).digest("hex");

    if (actualSha256 !== expectedSha256.toLowerCase()) {
        throw new Error(
            `SHA-256 doğrulaması başarısız.\n  beklenen: ${expectedSha256}\n  bulunan:  ${actualSha256}`
        );
    }

    mkdirSync(UPDATE_DIR, { recursive: true });
    writeFileSync(STAGED_ASAR, buffer);

    const pending: PendingUpdate = {
        version,
        sha256: actualSha256,
        size: buffer.byteLength,
        stagedAt: Date.now()
    };

    writeFileSync(STAGED_META, JSON.stringify(pending, null, 4));

    return pending;
}

export function discardPendingUpdate(): void {
    rmSync(UPDATE_DIR, { recursive: true, force: true });
}

/**
 * Kapanışta bekleyen güncellemeyi uygular.
 *
 * Çalışan süreç `app.asar`'ı açık tuttuğu için doğrudan üzerine yazamıyoruz.
 * Bunun yerine ayrı bir süreç başlatıyoruz: bizim PID kaybolana kadar bekliyor,
 * sonra dosyayı değiştiriyor.
 */
export function initUpdateApplier(): void {
    app.on("before-quit", () => {
        const pending = getPendingUpdate();
        if (pending == null) return;

        try {
            scheduleSwap(pending);
        } catch (err) {
            console.error("[MCord] Güncelleme uygulanamadı:", err);
        }
    });
}

function scheduleSwap(pending: PendingUpdate): void {
    // `resources/app.asar` — bizim şu an çalıştığımız dosya.
    const target = join(dirname(require.main!.path), "app.asar");

    if (process.platform !== "win32") {
        console.error("[MCord] Güncelleme uygulama yalnızca Windows'ta desteklenir.");
        return;
    }

    const script = [
        "$ErrorActionPreference = 'Stop'",
        `while (Get-Process -Id ${process.pid} -ErrorAction SilentlyContinue) { Start-Sleep -Milliseconds 200 }`,
        `Copy-Item -LiteralPath '${STAGED_ASAR.replaceAll("'", "''")}' -Destination '${target.replaceAll("'", "''")}' -Force`,
        `Remove-Item -LiteralPath '${UPDATE_DIR.replaceAll("'", "''")}' -Recurse -Force`
    ].join("; ");

    const child = spawn(
        "powershell.exe",
        ["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", script],
        { detached: true, stdio: "ignore", windowsHide: true }
    );

    child.unref();

    console.log(`[MCord] Güncelleme ${pending.version} kapanıştan sonra uygulanacak.`);
}
