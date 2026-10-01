/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/*
 * Scanner app'ine ham veri aktarımı. Yalnızca `reporter.ts`'ten import edilir;
 * üretim build'inde reporter stub'la değiştiği için pakete girmez. Sayfada
 * `window.MCordScannerSink` yoksa (CI koşusu) hiçbir şey yapmaz.
 *
 * JSON şekli scanner'daki `src/scan/payload.ts` (`mcord-scan/1`) ile aynıdır.
 * Akış: `meta` → `patches` → (`progress`)* → `finds` → `report` → `modules`* → `done`.
 * `progress` ({ done, total }) yalnızca kalp atışıdır; payload'a girmez.
 */

import { getBuildNumber, patchTrace } from "../webpack/codePatcher";
import { byStoreName, describeFilter } from "../webpack/filters";
import { find, findModuleId } from "../webpack/finder";
import { lazyWebpackSearchHistory, setRecordSearchHistory, wreq } from "../webpack/intercept";
import { resolveStore } from "../webpack/stores";
import type { ModuleFilter } from "../webpack/types";
import { isEnvironmentLimitedLabel } from "./environmentLimited";
import { skippedLazyChunks } from "./loadLazyChunks";
import type { Report } from "./reporter";

type Sink = (kind: string, data: unknown) => void;

export function serializePat(pat: string | RegExp): { source: string; flags: string; isRegex: boolean } {
    return typeof pat === "string"
        ? { source: pat, flags: "", isRegex: false }
        : { source: pat.source, flags: pat.flags, isRegex: true };
}

export function shapeOf(value: unknown): string[] | null {
    if (value == null) return null;
    if (typeof value === "function" && Object.getOwnPropertyNames(value).every(k => ["length", "name", "prototype"].includes(k))) {
        return ["<function>"];
    }
    if (typeof value !== "object" && typeof value !== "function") return [`<${typeof value}>`];
    try {
        return Object.getOwnPropertyNames(value).sort().slice(0, 50);
    } catch {
        return null;
    }
}

export function chunkModules(modules: Record<string, string>, size: number): Array<Record<string, string>> {
    const out: Array<Record<string, string>> = [];
    let current: Record<string, string> = {};
    let n = 0;
    for (const [id, src] of Object.entries(modules)) {
        current[id] = src;
        if (++n === size) { out.push(current); current = {}; n = 0; }
    }
    if (n > 0) out.push(current);
    return out;
}

function collectPatches() {
    return [...patchTrace.entries()].map(([patch, trace]) => {
        const replacements = Array.isArray(patch.replacement) ? patch.replacement : [patch.replacement];
        const find = serializePat(patch.find);
        return {
            plugin: patch.plugin,
            index: trace.index,
            find: find.source,
            findIsRegex: find.isRegex,
            findFlags: find.flags,
            matches: replacements.map(r => serializePat(r.match)),
            all: patch.all === true,
            hits: trace.hits,
            misses: trace.misses,
            errors: trace.errors
        };
    });
}

/** Kaç aramada bir olay döngüsüne yer açılıp kalp atışı gönderilir. */
const FIND_YIELD_EVERY = 20;

async function collectFinds(sink: Sink) {
    const history = [...lazyWebpackSearchHistory];
    const total = history.length;
    const out: Array<{ kind: string; label: string; moduleId: string | null; shape: string[] | null; ok: boolean; envLimited: boolean }> = [];
    setRecordSearchHistory(false);
    try {
        for (let i = 0; i < total; i++) {
            // Her arama 20 bin modül tarıyor: tek blokta sayfa donar ve scanner'ın
            // sessizlik sayacı dolar. Belli aralıklarla kalp atışı + olay döngüsü.
            if (i > 0 && i % FIND_YIELD_EVERY === 0) {
                sink("progress", { done: i, total });
                await new Promise(r => setTimeout(r, 0));
            }
            const [kind, args] = history[i];
            try {
                if (kind === "waitForStore" || kind === "findStoreLazy") {
                    const name = String(args[0]);
                    const store = resolveStore(name) ?? find(byStoreName(name), { silent: true });
                    const id = findModuleId(byStoreName(name), { silent: true });
                    const label = `store: ${name}`;
                    out.push({ kind, label, moduleId: id == null ? null : String(id), shape: shapeOf(store), ok: store != null, envLimited: isEnvironmentLimitedLabel(label) });
                    continue;
                }
                const filter = args[0] as ModuleFilter;
                if (typeof filter !== "function") continue;
                const value = find(filter, { silent: true });
                const id = findModuleId(filter, { silent: true });
                const label = describeFilter(filter);
                out.push({ kind, label, moduleId: id == null ? null : String(id), shape: shapeOf(value), ok: value != null, envLimited: isEnvironmentLimitedLabel(label) });
            } catch (err) {
                out.push({ kind, label: `${kind}: doğrulama hata verdi — ${String(err)}`, moduleId: null, shape: null, ok: false, envLimited: false });
            }
        }
    } finally {
        setRecordSearchHistory(true);
    }
    return out;
}

export function collectModules(factories: Record<PropertyKey, unknown> = wreq.m): Record<string, string> {
    const out: Record<string, string> = {};
    for (const id in factories) {
        // `Function.prototype.toString.call` Proxy'nin get trap'ini atlayıp
        // "[native code]" döndürür; orijinal kaynak için `String(...)` şart.
        try { out[id] = String(factories[id]); } catch { /* okunamayanı atla */ }
    }
    return out;
}

/** Rapor koşusu bittiğinde çağrılır. Sink yoksa no-op. */
export async function exportToScanner(report: Report): Promise<void> {
    const sink = (window as any).MCordScannerSink as Sink | undefined;
    if (typeof sink !== "function") return;

    try {
        const modules = collectModules();
        sink("meta", {
            branch: String((window as any).GLOBAL_ENV?.RELEASE_CHANNEL ?? "stable"),
            buildNumber: getBuildNumber(),
            buildHash: report.meta.buildHash,
            mcordCommit: report.meta.commitHash,
            moduleCount: Object.keys(modules).length,
            skippedChunks: skippedLazyChunks,
            scannedAt: new Date().toISOString(),
            partial: false
        });
        sink("patches", collectPatches());
        await new Promise(r => setTimeout(r, 0));
        sink("finds", await collectFinds(sink));
        sink("report", {
            badPatches: report.badPatches,
            erroredPatches: report.erroredPatches,
            badWebpackFinds: report.badWebpackFinds
        });
        for (const part of chunkModules(modules, 500)) {
            sink("modules", part);
            await new Promise(r => setTimeout(r, 0));
        }
        sink("done", null);
    } catch (err) {
        sink("failed", String(err));
    }
}
