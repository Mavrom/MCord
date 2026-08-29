/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Logger } from "../utils/logger";
import { addPatch, getBuildNumber, patches, patchTimings } from "../webpack/codePatcher";
import { describeFilter } from "../webpack/filters";
import { find } from "../webpack/finder";
import { lazyWebpackSearchHistory, wreq } from "../webpack/intercept";
import { mapMangledModule } from "../webpack/mangled";
import type { ModuleFilter } from "../webpack/types";
import { loadLazyChunks } from "./loadLazyChunks";
import { getTraceSummary } from "./tracer";

const logger = new Logger("Reporter", "#ca9ee6");

/** Bir patch'in "yavaş" sayılma eşiği (plan §9.1). */
const SLOW_PATCH_THRESHOLD_MS = 10;

export interface Report {
    meta: {
        buildNumber: number;
        buildHash: string | null;
        mcordVersion: string;
        commitHash: string;
        moduleCount: number;
        timestamp: number;
    };
    badPatches: Array<{ plugin: string; find: string; reason: string }>;
    slowPatches: Array<{ plugin: string; moduleId: string; match: string; time: number }>;
    badWebpackFinds: string[];
    traces: Array<{ name: string; totalTime: number }>;
    otherErrors: string[];
}

/**
 * Reporter build'inde Discord'un giriş noktasına patch atılır; uygulama mount
 * olmadan hemen önce rapor koşusu başlar (plan §9.1).
 */
export function registerReporterPatch(): void {
    if (!IS_REPORTER) return;

    addPatch({
        find: '"Could not find app-mount"',
        reason: "Reporter'ın Discord mount olmadan hemen önce devreye girmesi gerekiyor.",
        replacement: {
            match: /"Could not find app-mount"/,
            replace: "(Mcord.Reporter.init(),$&)"
        }
    }, "MCord Reporter");
}

const otherErrors: string[] = [];

/** Discord'un kendi gürültüsü — rapora girmemeli (plan §9.2). */
const IGNORED_DISCORD_ERRORS = [
    "KeybindStore: Looking for callback action",
    "Unable to process domain list delta",
    "Cannot read properties of undefined (reading 'delete')",
    "[GatewaySocket]",
    "Cannot access '",
    "was preloaded using link preload but not used"
] as const;

export function recordConsoleError(message: string): void {
    if (IGNORED_DISCORD_ERRORS.some(ignored => message.includes(ignored))) return;
    otherErrors.push(message);
}

let running = false;

/** Discord entry point patch'i tarafından çağrılır. */
export async function init(): Promise<void> {
    if (running) return;
    running = true;

    logger.info("Rapor koşusu başlıyor…");

    try {
        await loadLazyChunks();
        requireAllModules();

        const report = buildReport();

        (window as any).McordReport = report;

        // Puppeteer bu satırları okuyor.
        console.log("[REPORTER_META]", JSON.stringify(report.meta));
        console.log("[REPORTER_DONE]", JSON.stringify(report));

        logSummary(report);
    } catch (err) {
        logger.error("Rapor koşusu başarısız:\n", err);
        console.log("[REPORTER_FAILED]", String(err));
    }
}

/** Tüm modülleri manuel require et — patch'ler ve aramalar tetiklensin. */
function requireAllModules(): void {
    let failed = 0;

    for (const moduleId of Object.keys(wreq.m)) {
        try {
            wreq(moduleId as any);
        } catch {
            failed++;
        }
    }

    logger.info(`${Object.keys(wreq.m).length} modül require edildi (${failed} hata).`);
}

function buildReport(): Report {
    return {
        meta: {
            buildNumber: getBuildNumber(),
            buildHash: (window as any).GLOBAL_ENV?.SENTRY_TAGS?.buildId ?? null,
            mcordVersion: VERSION,
            commitHash: COMMIT_HASH,
            moduleCount: Object.keys(wreq.m).length,
            timestamp: Date.now()
        },
        badPatches: findBadPatches(),
        slowPatches: findSlowPatches(),
        badWebpackFinds: findBadWebpackFinds(),
        traces: getTraceSummary(),
        otherErrors
    };
}

/**
 * **Bad Patches:** koşu bittiğinde `patches` dizisinde kalan `!patch.all`
 * patch'leri hiçbir modüle uymamış demektir — uygulananlar listeden düşüyor
 * (bkz. `codePatcher.ts`, adım 5).
 */
function findBadPatches(): Report["badPatches"] {
    return patches
        .filter(patch => !patch.all)
        .map(patch => ({
            plugin: patch.plugin,
            find: String(patch.find),
            reason: patch.reason
        }));
}

function findSlowPatches(): Report["slowPatches"] {
    return patchTimings
        .filter(timing => timing.time > SLOW_PATCH_THRESHOLD_MS)
        .sort((a, b) => b.time - a.time)
        .map(timing => ({
            plugin: timing.plugin,
            moduleId: String(timing.moduleId),
            match: timing.match,
            time: Number(timing.time.toFixed(2))
        }));
}

/**
 * **Bad Webpack Finds:** `lazyWebpackSearchHistory`'deki tüm aramalar yeniden
 * çalıştırılır, `null` dönenler raporlanır.
 *
 * Her arama türü kendi doğrulama mantığına sahip; `mapMangledModule` için sonuç
 * anahtar sayısı mapper anahtar sayısıyla eşleşmeli (plan §9.1).
 */
function findBadWebpackFinds(): string[] {
    const bad: string[] = [];

    for (const [kind, args] of lazyWebpackSearchHistory) {
        try {
            switch (kind) {
                case "waitFor":
                case "getLazy":
                case "findLazy": {
                    const filter = args[0] as ModuleFilter;
                    if (find(filter, { silent: true }) == null) {
                        bad.push(`${kind}: ${describeFilter(filter)}`);
                    }
                    break;
                }

                case "mapMangledModule":
                case "mapMangledModuleLazy": {
                    const filter = args[0] as ModuleFilter;
                    const mappers = args[1] as Record<string, unknown>;
                    const result = mapMangledModule(filter, mappers as any, { silent: true });

                    const expected = Object.keys(mappers).length;
                    const actual = Object.keys(result).length;

                    if (actual !== expected) {
                        const missing = Object.keys(mappers).filter(key => !(key in result));
                        bad.push(
                            `${kind}: ${describeFilter(filter)} — ` +
                            `${actual}/${expected} eşleşti, eksik: ${missing.join(", ")}`
                        );
                    }
                    break;
                }

                default:
                    bad.push(`bilinmeyen arama türü: ${kind}`);
            }
        } catch (err) {
            bad.push(`${kind}: doğrulama hata verdi — ${String(err)}`);
        }
    }

    return bad;
}

function logSummary(report: Report): void {
    const { badPatches, slowPatches, badWebpackFinds } = report;

    if (badPatches.length === 0 && badWebpackFinds.length === 0) {
        logger.info(`✔ Tüm patch'ler ve aramalar geçerli (build ${report.meta.buildNumber}).`);
    } else {
        logger.error(
            `✘ ${badPatches.length} kırık patch, ${badWebpackFinds.length} kırık arama ` +
            `(build ${report.meta.buildNumber}).`
        );
    }

    if (slowPatches.length > 0) {
        logger.warn(`${slowPatches.length} patch ${SLOW_PATCH_THRESHOLD_MS} ms'den uzun sürdü.`);
    }
}
