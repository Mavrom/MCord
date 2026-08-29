/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { fetchJson } from "../../../api/net";
import { Settings } from "../../../api/settings";
import { REPO_URL } from "../../../utils/constants";
import { Logger } from "../../../utils/logger";

const logger = new Logger("Updater", "#8caaee");

/** Git tabanlı mod yok — kullanıcının git kurulu olmasını beklemiyoruz (plan §10.1). */
const RELEASES_API = REPO_URL.replace("https://github.com/", "https://api.github.com/repos/")
    + "/releases/latest";

export interface ReleaseInfo {
    version: string;
    tag: string;
    changelog: string;
    publishedAt: string;
    assetUrl: string | null;
    /** `app.asar.json` manifestinin adresi — SHA-256 buradan okunuyor. */
    manifestUrl: string | null;
    /** Sürüm notundaki test edilmiş Discord build aralığı (plan §10.2). */
    testedBuilds: string | null;
}

export interface UpdateState {
    current: string;
    latest: ReleaseInfo | null;
    available: boolean;
    checkedAt: number | null;
    error: string | null;
}

let state: UpdateState = {
    current: VERSION,
    latest: null,
    available: false,
    checkedAt: null,
    error: null
};

export function getUpdateState(): UpdateState {
    return state;
}

export async function checkForUpdates(): Promise<UpdateState> {
    try {
        const release = await fetchJson<any>(RELEASES_API, {
            headers: { Accept: "application/vnd.github+json" }
        });

        const tag = String(release.tag_name ?? "");
        const version = tag.replace(/^v/, "");

        const assets = release.assets ?? [];
        const asset = assets.find((a: any) => a.name === "app.asar");
        const manifest = assets.find((a: any) => a.name === "app.asar.json");

        const latest: ReleaseInfo = {
            version,
            tag,
            changelog: String(release.body ?? ""),
            publishedAt: String(release.published_at ?? ""),
            assetUrl: asset?.browser_download_url ?? null,
            manifestUrl: manifest?.browser_download_url ?? null,
            testedBuilds: extractTestedBuilds(String(release.body ?? ""))
        };

        state = {
            current: VERSION,
            latest,
            available: isNewer(version, VERSION) && !isSkipped(version),
            checkedAt: Date.now(),
            error: null
        };

        logger.info(state.available
            ? `Yeni sürüm mevcut: ${version} (şu an ${VERSION})`
            : `Güncel: ${VERSION}`);
    } catch (err) {
        state = { ...state, checkedAt: Date.now(), error: String(err) };
        logger.warn("Güncelleme kontrolü başarısız:\n", err);
    }

    return state;
}

/** Kullanıcı bu sürümü atladıysa bildirim gösterme (plan §10.1). */
export function skipVersion(version: string): void {
    (Settings.plugins.Updater ??= {}).skippedVersion = version;
}

function isSkipped(version: string): boolean {
    return Settings.plugins.Updater?.skippedVersion === version;
}

/** `v1.4.0 — Discord build 400000-410000 ile test edildi` (plan §10.2). */
function extractTestedBuilds(changelog: string): string | null {
    return changelog.match(/Discord build\s+([\d\s\-–]+)\s*ile test edildi/i)?.[1]?.trim() ?? null;
}

export function isNewer(candidate: string, current: string): boolean {
    const a = parse(candidate);
    const b = parse(current);

    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        const x = a[i] ?? 0;
        const y = b[i] ?? 0;
        if (x > y) return true;
        if (x < y) return false;
    }

    return false;
}

function parse(version: string): number[] {
    return version.split(/[.\-+]/).map(part => Number.parseInt(part, 10) || 0);
}

export interface AsarManifest {
    version: string;
    size: number;
    sha256: string;
}

/**
 * Yeni sürümü indirir ve SHA-256 ile doğrular (plan §10.1, §13).
 *
 * Özet, sürüm varlıkları arasındaki `app.asar.json` manifestinden okunur;
 * doğrulama main process tarafında yapılır.
 */
export async function downloadRelease(release: ReleaseInfo): Promise<void> {
    if (!release.assetUrl) {
        throw new Error("Sürümde `app.asar` varlığı yok.");
    }

    if (!release.manifestUrl) {
        throw new Error("Sürümde `app.asar.json` manifesti yok — doğrulama yapılamaz.");
    }

    const manifest = await fetchJson<AsarManifest>(release.manifestUrl);

    if (typeof manifest?.sha256 !== "string" || manifest.sha256.length !== 64) {
        throw new Error("Manifestteki SHA-256 geçersiz.");
    }

    await window.McordNative.updater.download(release.assetUrl, manifest.sha256, release.version);

    logger.info(`${release.version} indirildi ve doğrulandı; kapanışta uygulanacak.`);
}
