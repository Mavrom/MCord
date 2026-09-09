/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Logger } from "../utils/logger";
import { addPatch, getBuildNumber, patches, patchTimings } from "../webpack/codePatcher";
import { byStoreName, describeFilter } from "../webpack/filters";
import { find } from "../webpack/finder";
import { erroredPatches, lazyWebpackSearchHistory, setRecordSearchHistory, wreq } from "../webpack/intercept";
import { mapMangledModule } from "../webpack/mangled";
import { recoverStoreModules, resolveStore } from "../webpack/stores";
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
    erroredPatches: Array<{ moduleId: string; plugins: string[]; error: string }>;
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

/**
 * Bu ortamda (headless tarayici, giris yok, native ses motoru yok) Discord'un
 * hic olusturmadigi store'lar. Gercek masaustu istemcide calisiyorlar; CI
 * sinyalini kirletmemeleri icin "kirik" saymiyoruz.
 *
 *  - ReadStateStore   : okunma durumu, oturum gerektiriyor
 *  - MediaEngineStore : Discord'un native ses motoru (headless'ta yok)
 *  - ChannelRTCStore  : RTC/ses baglantisi
 */
const ENVIRONMENT_LIMITED_STORES = new Set([
    "ReadStateStore",
    "MediaEngineStore",
    "ChannelRTCStore"
]);

const otherErrors: string[] = [];

/**
 * Discord'un kendi gürültüsü — rapora girmemeli (plan §9.2).
 *
 * Kanıtlanmış açık-kaynak istemcinin `generateReport` filtresiyle aynı liste +
 * ek olarak "Webpack" içeren her satır eleniyor: bunlar bizim kendi yakalama
 * katmanımızın modülleri sırasız require ederken ürettiği beklenen churn.
 */
const IGNORED_DISCORD_ERRORS = [
    "KeybindStore: Looking for callback action",
    "Unable to process domain list delta",
    "Downloading the full bad domains file",
    "Cannot read properties of undefined (reading 'delete')",
    "[GatewaySocket]",
    "Cannot access '",
    "search for 'name' in undefined",
    "Attempting to set fast connect zstd when unsupported",
    "was preloaded using link preload but not used",
    // Sirasiz zorla-yukleme sirasinda Discord'un kendi modulleri arasinda
    // olusan basamakli hata; gercek istemcide olusmuyor.
    "Cannot read properties of undefined (reading 'Ay')"
] as const;

export function recordConsoleError(message: string): void {
    if (message.includes("Webpack")) return;
    if (message.startsWith("Failed to load resource: the server responded with a status of")) return;
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
        // Faz işaretçileri: CI logunda hangi aşamada takıldığı net görünsün
        // (loadLazyChunks = ağ-bağımlı; requireAllModules = patch-bağımlı).
        const t0 = Date.now();
        console.log("[REPORTER_PHASE]", "loadLazyChunks başladı");
        await loadLazyChunks();
        console.log("[REPORTER_PHASE]", `loadLazyChunks bitti (+${Math.round((Date.now() - t0) / 1000)}s, ${Object.keys(wreq.m).length} fabrika)`);

        const t1 = Date.now();
        console.log("[REPORTER_PHASE]", "requireAllModules başladı");
        requireAllModules();
        console.log("[REPORTER_PHASE]", `requireAllModules bitti (+${Math.round((Date.now() - t1) / 1000)}s)`);

        const meta = buildMeta();
        console.log("[REPORTER_META]", JSON.stringify(meta));

        // Vencord'un yaklaşımı: kırıkları **akış halinde** yay. 20 bin modülle
        // tek bloklu pass sayfayı donduruyor; olay döngüsüne yer açarak hem
        // Puppeteer console olayları akıyor hem sayfa yanıt veriyor.
        const badPatches = findBadPatches();
        for (const patch of badPatches) {
            console.log("[REPORTER_BAD_PATCH]", JSON.stringify(patch));
        }

        // Çalışma anında patlayan patch'ler — plugin başına grupla.
        const erroredByPlugin = groupErroredPatches();
        for (const entry of erroredByPlugin) {
            console.log("[REPORTER_ERRORED_PATCH]", JSON.stringify(entry));
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
            meta, badPatches,
            // Yalnız bir plugin'e atfedilebilenler eyleme dönük; atıfsız TDZ
            // gürültüsü rapora girmiyor (yukarıdaki `groupErroredPatches` notu).
            erroredPatches: actionableErroredPatches(),
            slowPatches, badWebpackFinds,
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

/**
 * Tüm modülleri manuel require et — patch'ler ve aramalar tetiklensin.
 *
 * **Çok geçişli:** tek geçişte bir modül, bağımlılığı henüz yüklenmediği için
 * `Cannot access X before initialization` / `Cannot read 'Ay'` ile patlıyor ve
 * bir daha denenmiyordu; o modülün içindeki store/action/component hiç
 * bulunamıyordu. Sonraki geçişlerde bağımlılıklar hazır olduğu için başarılı
 * oluyorlar. Yeni başarı gelmeyene kadar (en fazla 4 tur) tekrarlıyoruz.
 */
function requireAllModules(): void {
    const ids = Object.keys(wreq.m);
    const total = ids.length;
    let pending = ids;

    for (let pass = 1; pass <= 4 && pending.length > 0; pass++) {
        const stillFailing: string[] = [];
        let done = 0;
        let lastBeat = Date.now();

        for (const moduleId of pending) {
            try {
                wreq(moduleId as any);
            } catch {
                // KRİTİK: fabrika patlayınca webpack yarım `module.exports`'u
                // cache'te bırakıyor ve sonraki `wreq()` fabrikayı hiç
                // çalıştırmadan o bozuk kaydı döndürüyor (export getter'ları
                // "Cannot access X before initialization" fırlatıyor).
                // Kaydı silmezsek yeniden deneme anlamsız olur.
                try {
                    delete (wreq as any).c?.[moduleId];
                } catch { /* silinemiyorsa geç */ }
                stillFailing.push(moduleId);
            }
            if (IS_REPORTER && ++done % 500 === 0 && Date.now() - lastBeat > 5000) {
                console.log("[REPORTER_PHASE]", `requireAllModules geçiş ${pass}: ${done}/${pending.length}`);
                lastBeat = Date.now();
            }
        }

        if (IS_REPORTER) {
            console.log("[REPORTER_PHASE]", `requireAllModules geçiş ${pass} bitti: ${stillFailing.length} hata (önceki ${pending.length})`);
        }

        // Yeni başarı yoksa devam etmenin anlamı yok.
        if (stillFailing.length === pending.length) {
            pending = stillFailing;
            break;
        }
        pending = stillFailing;
    }

    healPoisonedModules();
    recoverStoreModules();

    logger.info(`${total} modül require edildi (${pending.length} kalıcı hata).`);
}

/**
 * "Zehirlenmiş" modülleri iyileştirir.
 *
 * Bir modülün fabrikası **fırlatmadan** yarım kalabiliyor: webpack `wreq.d` ile
 * export getter'larını en başta tanımlıyor, ama getter'ın kapattığı modül-içi
 * `let` değişkeni (dairesel bağımlılık yüzünden) hiç atanmıyor. Sonuç:
 * `exports.A` erişimi `Cannot access 'x' before initialization` fırlatıyor ve o
 * modüldeki store/component hiçbir aramada görünmüyor. ChannelStore'un modülü
 * (734057) tam olarak buydu.
 *
 * Çözüm: her cache kaydının export'larına dokunup fırlatanı tespit et, cache
 * kaydını sil ve fabrikayı **gerçekten** yeniden çalıştır.
 */
function healPoisonedModules(): void {
    const cacheObj = (wreq as any).c;
    if (cacheObj == null) return;

    let previous = Infinity;
    for (let pass = 1; pass <= 12; pass++) {
        const poisoned: string[] = [];

        for (const id of Object.getOwnPropertyNames(cacheObj)) {
            const exports = cacheObj[id]?.exports;
            if (exports == null || typeof exports !== "object") continue;

            let bad = false;
            for (const key of Object.getOwnPropertyNames(exports)) {
                try {
                    void (exports as any)[key];
                } catch {
                    bad = true;
                    break;
                }
            }
            if (bad) poisoned.push(id);
        }

        if (IS_REPORTER) {
            console.log("[REPORTER_PHASE]", `zehirli modül iyileştirme geçiş ${pass}: ${poisoned.length} modül`);
        }
        // Bitti ya da artık ilerlemiyor.
        if (poisoned.length === 0 || poisoned.length >= previous) return;
        previous = poisoned.length;

        // Tek tek sil + yeniden yükle. (Toplu silme denendi ve GERİ TEPTİ:
        // sağlıklı modüllerin tuttuğu referanslar bayatlıyor, store'lar iki kez
        // kaydoluyor — 876 store 807'ye düştü.)
        for (const id of poisoned) {
            try {
                delete cacheObj[id];
            } catch { continue; }
            try {
                wreq(id as any);
            } catch {
                try { delete cacheObj[id]; } catch { /* */ }
            }
        }
    }
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
                // Kanıtlanmış açık-kaynak istemcinin `findStore` yolu: önce Flux'un
                // statik kaydı, sonra webpack araması.
                if (resolveStore(name) != null) return null;
                if (ENVIRONMENT_LIMITED_STORES.has(name)) return null;
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

/**
 * Çalışma anında patlayan patch'leri plugin(ler)e göre grupla — hangi
 * MCord plugin'inin patch'i canlıda bozuk kod üretiyor, tek bakışta görülsün.
 *
 * Atıfsız olanlar (`plugins` boş) raporlanmıyor: 20 bin modülü sırasız require
 * ederken Discord'un kendi kodu da bol bol TDZ/`Cannot read` fırlatıyor —
 * kanıtlanmış açık-kaynak istemci de bunları rapora almıyor, sadece konsola
 * basıp orijinaline düşüyor.
 */
/**
 * Gerçekten eyleme dönük çalışma-anı patch hataları.
 *
 * `requireAllModules` 20 bin modülü **sırasız** yüklüyor; bir modül bağımlılığı
 * hazır olmadan çalıştırıldığında patch'lenmiş fabrikası patlıyor ve orijinaline
 * düşüyoruz. Sonraki geçişler + `healPoisonedModules` o modülü düzeltiyor —
 * yani patch aslında sağlam. Yalnız **sonunda hâlâ bozuk** kalan modülleri
 * raporluyoruz.
 */
function actionableErroredPatches(): Report["erroredPatches"] {
    const cacheObj = (wreq as any)?.c;

    return erroredPatches.filter(entry => {
        if (entry.plugins.length === 0) return false;
        if (cacheObj == null) return true;

        const mod = cacheObj[entry.moduleId];
        if (mod == null) return true;

        const exports = mod.exports;
        if (exports == null) return true;
        if (typeof exports !== "object") return false;

        // Export'lardan biri hâlâ fırlatıyorsa modül gerçekten bozuk.
        for (const key of Object.getOwnPropertyNames(exports)) {
            try {
                void (exports as any)[key];
            } catch {
                return true;
            }
        }
        return false;
    });
}

function groupErroredPatches(): Array<{ plugins: string; count: number; sampleModule: string; sampleError: string }> {
    const byKey = new Map<string, { plugins: string; count: number; sampleModule: string; sampleError: string }>();
    for (const entry of actionableErroredPatches()) {
        if (!entry.plugins.length) continue;
        const key = entry.plugins.join(", ");
        const existing = byKey.get(key);
        if (existing) {
            existing.count++;
        } else {
            byKey.set(key, {
                plugins: key,
                count: 1,
                sampleModule: entry.moduleId,
                sampleError: entry.error.slice(0, 200)
            });
        }
    }
    return [...byKey.values()].sort((a, b) => b.count - a.count);
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
    const erroredCount = report.erroredPatches.length;

    if (badPatches.length === 0 && badWebpackFinds.length === 0 && erroredCount === 0) {
        logger.info(`✔ Tüm patch'ler ve aramalar geçerli (build ${report.meta.buildNumber}).`);
    } else {
        logger.error(
            `✘ ${badPatches.length} kırık patch, ${erroredCount} çalışma-anı patch hatası, ` +
            `${badWebpackFinds.length} kırık arama (build ${report.meta.buildNumber}).`
        );
    }

    if (slowPatches.length > 0) {
        logger.warn(`${slowPatches.length} patch ${SLOW_PATCH_THRESHOLD_MS} ms'den uzun sürdü.`);
    }
}
