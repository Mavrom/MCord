/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import type * as DiffModule from "diff";

import { Logger } from "../utils/logger";
import { canonicalizePatch } from "../utils/patches";
import type { Patch, PatchDefinition, PatchReplacement, ReplaceFn } from "../utils/types";
import { wreq } from "./intercept";
import { setFactoryPatcher } from "./proxy";
import type { ModuleFactory, PatchedModuleFactory } from "./types";

const logger = new Logger("Patcher:Code", "#e5c890");

/** Kayıtlı tüm kod patch'leri. `PluginManager` başlatmada buraya yazıyor. */
export const patches: Patch[] = [];

/** Hangi modülü hangi pluginlerin patch'lediği — çökme atıfı için (plan §8.2). */
export const SYM_PATCHED_BY = Symbol.for("MCord.patchedBy");
export const SYM_PATCHED_SOURCE = Symbol.for("MCord.patchedSource");

/** Patch süreleri — reporter ve seçici eager listesi için (plan §9.1, §11.1). */
export const patchTimings: Array<{
    plugin: string;
    moduleId: PropertyKey;
    match: string;
    time: number;
}> = [];

export function addPatch(patchDefinition: PatchDefinition, pluginName: string): void {
    const patch = { ...patchDefinition, plugin: pluginName } as Patch;

    if (IS_REPORTER) {
        // Tüm patch'ler denensin ve her hata görünsün: koşullu atlama ve grup
        // geri alma reporter'da kapalı (plan §9.1).
        delete patch.predicate;
        delete patch.group;
    }

    patches.push(canonicalizePatch(patch));
}

/** Kod patch katmanını proxy'ye bağlar (Faz 3). */
export function initCodePatcher(): void {
    setFactoryPatcher(patchFactory);
}

// ── Discord build numarası (plan §9.3) ───────────────────────────────────────

const CHANGELOG_MARKER = "Trying to open a changelog for an invalid build number";
const BUILD_NUMBER_PATTERNS = [
    /buildNumber\W{0,4}?(\d{5,})/,
    /,build:"?(\d{5,})"?/
];

let cachedBuildNumber: number | null = null;

/**
 * `fromBuild`/`toBuild` sistemi buna dayanıyor.
 *
 * Önce bilinen changelog modülü aranıyor, sonra kaynağından regex'le sayı
 * çekiliyor. Bulunamazsa `-1` — build aralığı kontrolleri devre dışı kalıyor.
 */
export function getBuildNumber(): number {
    if (cachedBuildNumber != null) return cachedBuildNumber;
    cachedBuildNumber = -1;

    if (wreq?.m == null) return cachedBuildNumber;

    for (const moduleId in wreq.m) {
        let source: string;
        try {
            source = String(wreq.m[moduleId]);
        } catch {
            continue;
        }

        if (!source.includes(CHANGELOG_MARKER)) continue;

        for (const pattern of BUILD_NUMBER_PATTERNS) {
            const match = source.match(pattern);
            if (match) {
                cachedBuildNumber = Number(match[1]);
                logger.debug(`Discord build numarası: ${cachedBuildNumber}`);
                return cachedBuildNumber;
            }
        }
    }

    return cachedBuildNumber;
}

// ── Fabrika patch'leme (plan §5.5) ───────────────────────────────────────────

function patchFactory(moduleId: PropertyKey, originalFactory: ModuleFactory): PatchedModuleFactory | null {
    const originalFactoryCode = String(originalFactory);

    // "0," öneki ifadeye çevirmek için: `0,function(){}` geçerli, `function(){}` değil.
    const isArrowFunction = originalFactoryCode.startsWith("(");
    let patchedCode = "0,"
        + (!isArrowFunction ? "function" : "")
        + originalFactoryCode.slice(originalFactoryCode.indexOf("("));

    let patchedFactory: PatchedModuleFactory | null = null;
    const appliedPlugins: string[] = [];

    const buildNumber = getBuildNumber();

    for (let i = 0; i < patches.length; i++) {
        const patch = patches[i];

        // ── 1. Build aralığı ────────────────────────────────────────────────
        // Aralık dışındaysa patch listeden **tamamen** çıkarılıyor, bir daha
        // denenmiyor.
        if (buildNumber !== -1 && isOutsideBuildRange(patch, buildNumber)) {
            logger.debug(
                `${patch.plugin}: build ${buildNumber} aralık dışında ` +
                `[${patch.fromBuild ?? "-"}, ${patch.toBuild ?? "-"}], patch kaldırıldı.`
            );
            patches.splice(i--, 1);
            continue;
        }

        if (patch.predicate && !patch.predicate()) continue;

        // ── 2. `find` eşleşmesi ─────────────────────────────────────────────
        if (!matchesFind(patch.find, originalFactoryCode)) continue;

        const replacements = patch.replacement as PatchReplacement[];
        const previousCode = patchedCode;
        const previousFactory: PatchedModuleFactory | null = patchedFactory;
        let shouldRestorePrevious = false;

        // ── 3. Replacement'lar ──────────────────────────────────────────────
        for (const replacement of replacements) {
            if (replacement.predicate && !replacement.predicate()) continue;

            const lastCode = patchedCode;
            const lastFactory: PatchedModuleFactory | null = patchedFactory;

            const start = performance.now();
            let newCode: string;
            try {
                newCode = executeReplacement(patchedCode, replacement);
            } catch (err) {
                logger.error(`${patch.plugin}: replacement çalıştırılamadı (modül ${String(moduleId)}):\n`, err);
                shouldRestorePrevious = patch.group === true;
                if (shouldRestorePrevious) break;
                continue;
            }
            const elapsed = performance.now() - start;

            patchTimings.push({
                plugin: patch.plugin,
                moduleId,
                match: String(replacement.match),
                time: elapsed
            });

            if (newCode === patchedCode) {
                // Eşleşmedi. Grup ise **tüm** grubu geri al: yarım uygulanmış
                // patch, hiç uygulanmamış patch'ten tehlikeli (plan §5.6).
                if (!patch.noWarn && !replacement.noWarn) {
                    logger.warn(
                        `${patch.plugin}: replacement eşleşmedi (modül ${String(moduleId)})\n` +
                        `  gerekçe: ${patch.reason}\n` +
                        `  match: ${String(replacement.match)}`
                    );
                    if (IS_DEV) logDiffContext(patchedCode, replacement);
                }

                if (patch.group) {
                    shouldRestorePrevious = true;
                    break;
                }
                continue;
            }

            const newPatchedSource =
                `// Webpack Module ${String(moduleId)} - Patched by ${[...appliedPlugins, patch.plugin].join(", ")}\n`
                + `${newCode}\n`
                + `//# sourceURL=file:///WebpackModule${String(moduleId)}`;

            let evaluated: PatchedModuleFactory;
            try {
                evaluated = (0, eval)(newPatchedSource);
            } catch (err) {
                logger.error(
                    `${patch.plugin}: patch'lenmiş modül ${String(moduleId)} eval edilemedi ` +
                    "(muhtemelen sözdizimi hatası):\n", err
                );
                if (IS_DEV) logDiff(lastCode, newCode);

                patchedCode = lastCode;
                patchedFactory = lastFactory;

                if (patch.group) {
                    shouldRestorePrevious = true;
                    break;
                }
                continue;
            }

            patchedCode = newCode;
            patchedFactory = evaluated;
        }

        // ── 4. Grup geri alma ───────────────────────────────────────────────
        if (shouldRestorePrevious) {
            logger.warn(`${patch.plugin}: grup patch'i eksik uygulandı, tümü geri alındı (modül ${String(moduleId)}).`);
            patchedCode = previousCode;
            patchedFactory = previousFactory;
            continue;
        }

        if (patchedFactory !== previousFactory) appliedPlugins.push(patch.plugin);

        // ── 5. Tek modüle uygulanan patch listeden düşer ────────────────────
        if (!patch.all) patches.splice(i--, 1);
    }

    if (patchedFactory == null) return null;

    // Çökme atıfı: hangi pluginler bu modülü patch'ledi (plan §8.2).
    Object.defineProperty(patchedFactory, SYM_PATCHED_BY, {
        value: appliedPlugins, enumerable: false, configurable: true
    });
    Object.defineProperty(patchedFactory, SYM_PATCHED_SOURCE, {
        value: patchedCode, enumerable: false, configurable: true
    });

    // `bySource` filtresi ham kaynağı görmeye devam etsin.
    patchedFactory.toString = () => originalFactoryCode;
    patchedFactory.$$mcordOriginal = originalFactory;

    return patchedFactory;
}

function isOutsideBuildRange(patch: Patch, buildNumber: number): boolean {
    if (patch.fromBuild != null && buildNumber < patch.fromBuild) return true;
    if (patch.toBuild != null && buildNumber > patch.toBuild) return true;
    return false;
}

function matchesFind(find: string | RegExp, source: string): boolean {
    if (typeof find === "string") return source.includes(find);

    // Global regex'lerde `lastIndex` sıfırlanmazsa sinsi hata (plan §5.5).
    if (find.global) find.lastIndex = 0;
    return find.test(source);
}

function executeReplacement(code: string, replacement: PatchReplacement): string {
    const { match, replace } = replacement;

    if (match instanceof RegExp && match.global) match.lastIndex = 0;

    return typeof replace === "function"
        ? code.replace(match as any, replace as ReplaceFn)
        : code.replace(match as any, replace as string);
}

/**
 * Dev modda patch hatasında öncesi/sonrası renkli konsola basılıyor (plan §5.6).
 * `require("diff")` inline: `IS_DEV` false olduğunda esbuild bu dalı komple
 * eliyor, `diff` prod bundle'a girmiyor (plan §11.3).
 */
function logDiff(before: string, after: string): void {
    if (!IS_DEV) return;

    const { diffWordsWithSpace } = require("diff") as typeof DiffModule;
    const changes = diffWordsWithSpace(before, after);

    let output = "";
    const styles: string[] = [];

    for (const change of changes) {
        if (!change.added && !change.removed) {
            // Değişmeyen kısımdan 200 karakter bağlam.
            const context = change.value.length > 400
                ? `${change.value.slice(0, 200)}…${change.value.slice(-200)}`
                : change.value;
            output += `%c${context}`;
            styles.push("color:inherit");
            continue;
        }

        output += `%c${change.value}`;
        styles.push(change.added ? "color:#a6d189" : "color:#e78284;text-decoration:line-through");
    }

    console.log(output, ...styles);
}

/** Eşleşmeyen bir match için kodun ilgili bölgesini göstermeye çalışır. */
function logDiffContext(code: string, replacement: PatchReplacement): void {
    if (!IS_DEV) return;

    const { match } = replacement;
    const needle = typeof match === "string" ? match : match.source;

    // Desenin ilk 20 karakterlik "sabit" parçasını arayıp bağlam bas.
    const probe = needle.replace(/\\[a-z]|\[[^\]]*\]|[(){}?*+|^$]/g, "").slice(0, 20).trim();
    if (probe.length < 4) return;

    const index = code.indexOf(probe);
    if (index === -1) {
        logger.debug(`  bağlam bulunamadı — "${probe}" kaynakta hiç geçmiyor.`);
        return;
    }

    logger.debug(`  bağlam: …${code.slice(Math.max(0, index - 200), index + 200)}…`);
}
