/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Logger } from "../utils/logger";
import { addPatch, getBuildNumber, patches, patchTimings } from "../webpack/codePatcher";
import { byStoreName, describeFilter } from "../webpack/filters";
import { find } from "../webpack/finder";
import { lazyWebpackSearchHistory, setRecordSearchHistory, wreq } from "../webpack/intercept";
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

        const meta = buildMeta();
        console.log("[REPORTER_META]", JSON.stringify(meta));

        // Vencord'un yaklaşımı: kırıkları **akış halinde** yay. 20 bin modülle
        // tek bloklu pass sayfayı donduruyor; olay döngüsüne yer açarak hem
        // Puppeteer console olayları akıyor hem sayfa yanıt veriyor.
        const badPatches = findBadPatches();
        for (const patch of badPatches) {
            console.log("[REPORTER_BAD_PATCH]", JSON.stringify(patch));
        }

        const slowPatches = findSlowPatches();
        for (const patch of slowPatches.slice(0, 30)) {
            console.log("[REPORTER_SLOW_PATCH]", JSON.stringify(patch));
        }

        const badWebpackFinds: string[] = [];
        // Anlık görüntü + kayıt kapalı: `mapMangledModule` denetlenirken kendini
        // yeniden kaydediyor; canlı dizi üzerinde dönersek sonsuza kadar büyür.
        const history = [...lazyWebpackSearchHistory];
        const total = history.length;
        let i = 0;
        setRecordSearchHistory(false);
        try {
            for (const [kind, args] of history) {
                // Her adımda kalp atışı + olay döngüsüne yer: her `find` 20 bin
                // modül tarıyor, tek blokta sayfa donar ve CI "takıldı" sanır.
                console.log("[REPORTER_PROGRESS]", `${++i}/${total} — ${kind} ${describeEntry(kind, args)}`);
                await new Promise(resolve => setTimeout(resolve, 0));

                const label = checkSearchEntry(kind, args);
                if (label != null && !badWebpackFinds.includes(label)) {
                    badWebpackFinds.push(label);
                    console.log("[REPORTER_FIND_FAIL]", label);
                }
            }
        } finally {
            setRecordSearchHistory(true);
        }

        const report: Report = {
            meta, badPatches, slowPatches, badWebpackFinds,
            traces: getTraceSummary(), otherErrors
        };
        (window as any).McordReport = report;

        console.log("[REPORTER_DONE]", JSON.stringify(report));
        logSummary(report);
    } catch (err) {
        logger.error("Rapor koşusu başarısız:\n", err);
        console.log("[REPORTER_FAILED]", String(err));
    }
}

function buildMeta(): Report["meta"] {
    return {
        buildNumber: getBuildNumber(),
        buildHash: (window as any).GLOBAL_ENV?.SENTRY_TAGS?.buildId ?? null,
        mcordVersion: VERSION,
        commitHash: COMMIT_HASH,
        moduleCount: Object.keys(wreq.m).length,
        timestamp: Date.now()
    };
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

/** Girdiyi çalıştırmadan önce insan-okunur kısa etiket — hangi arama takıldı görmek için. */
function describeEntry(kind: string, args: unknown[]): string {
    try {
        const first = args[0];
        if (typeof first === "function") return describeFilter(first as ModuleFilter);
        if (typeof first === "string") return first;
        return String(first);
    } catch {
        return "?";
    }
}

/** Bir arama geçmişi girdisini yeniden çalıştırır; kırıksa etiketini döndürür. */
function checkSearchEntry(kind: string, args: unknown[]): string | null {
    try {
        switch (kind) {
            case "waitFor":
            case "getLazy":
            case "findLazy": {
                const filter = args[0] as ModuleFilter;
                if (typeof filter !== "function") return null;
                return find(filter, { silent: true }) == null
                    ? `${kind}: ${describeFilter(filter)}`
                    : null;
            }
            case "waitForStore":
            case "findStoreLazy": {
                const name = args[0] as string;
                return find(byStoreName(name), { silent: true }) == null ? `store: ${name}` : null;
            }
            case "mapMangledModule":
            case "mapMangledModuleLazy": {
                const filter = args[0] as ModuleFilter;
                const mappers = args[1] as Record<string, unknown>;
                const result = mapMangledModule(filter, mappers as any, { silent: true });
                const expected = Object.keys(mappers).length;
                const actual = Object.keys(result).length;
                if (actual === expected) return null;
                const missing = Object.keys(mappers).filter(key => !(key in result));
                return `${kind}: ${describeFilter(filter)} — ${actual}/${expected} eşleşti, eksik: ${missing.join(", ")}`;
            }
            default:
                return `bilinmeyen arama türü: ${kind}`;
        }
    } catch (err) {
        return `${kind}: doğrulama hata verdi — ${String(err)}`;
    }
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
export function findBadWebpackFinds(): string[] {
    const bad: string[] = [];
    const history = [...lazyWebpackSearchHistory];
    setRecordSearchHistory(false);
    try {
        for (const [kind, args] of history) {
            const label = checkSearchEntry(kind, args);
            if (label != null && !bad.includes(label)) bad.push(label);
        }
    } finally {
        setRecordSearchHistory(true);
    }
    return bad;
}

let selfCheckDone = false;

/**
 * Client tarafı finder sağlık kontrolü — reporter build'i değil, normal build.
 * Açılıştan bir süre sonra tüm kayıtlı lazy aramaları çalıştırır, kırıkları
 * tek satırda konsola basar. Kullanıcı o listeyi paylaşır, sadece kırıklar
 * düzeltilir.
 */
export function runClientSelfCheck(delayMs = 10_000): void {
    if (selfCheckDone) return;
    selfCheckDone = true;

    setTimeout(() => {
        try {
            const bad = findBadWebpackFinds();
            if (bad.length === 0) {
                logger.info("✔ webpack finder self-check: hepsi sağlam.");
            } else {
                logger.warn(
                    `✘ webpack finder self-check — ${bad.length} kırık:\n` + bad.map(x => "  • " + x).join("\n")
                );
                (window as any).McordBrokenFinders = bad;
            }
        } catch (err) {
            logger.error("Self-check hata verdi:\n", err);
        }
    }, delayMs);
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
