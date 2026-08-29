/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Logger } from "../utils/logger";
import type {
    AfterCallback,
    AnyFunction,
    BeforeCallback,
    ChildPatch,
    InsteadCallback,
    PatchCallback,
    PatchOptions,
    PatchType
} from "./types";

const logger = new Logger("Patcher", "#a6d189");

/**
 * Çökme atıfı için çalışma zamanı bağlamı (plan §8.2).
 *
 * Bir plugin'in patch callback'i çalışırken buraya adı yazılıyor; ErrorBoundary
 * patch'i hatayı yakaladığında suçluyu stack trace regex'ine gerek kalmadan
 * buradan öğreniyor.
 */
export let currentPluginContext: string | null = null;

/**
 * Son patch hataları — çökme atıfı için (plan §8.2).
 *
 * Fonksiyon patch'i patladığında hangi plugin olduğunu burada tutuyoruz;
 * ErrorBoundary patch'i suçluyu stack trace regex'ine gerek kalmadan okuyor.
 */
export const recentPatchErrors: Array<{ caller: string; at: number; error: unknown }> = [];

const MAX_RECENT_ERRORS = 20;

let nextPatchId = 0;

/** Bir modül+fonksiyon çifti için tek `Patch` kaydı tutulur (plan §5.2). */
class Patch {
    readonly children: ChildPatch[] = [];
    readonly originalFunction: AnyFunction;
    proxyFunction: AnyFunction | null = null;

    constructor(
        readonly module: any,
        readonly functionName: string,
        readonly displayName: string
    ) {
        this.originalFunction = module[functionName];
    }

    revert(): void {
        this.module[this.functionName] = this.originalFunction;
        this.proxyFunction = null;
    }

    /**
     * Sarmalayıcıyı üretir (plan §5.2, `makeOverride`).
     *
     * Sıra: tüm `before`'lar → zincirlenmiş `instead`'ler → tüm `after`'lar.
     * **Her callback ayrı try/catch'te**: bir plugin'in patch'i patlarsa
     * diğerleri çalışmaya devam ediyor. Bu izolasyon stabilite hedefinin temeli.
     */
    makeOverride(): AnyFunction {
        const patch = this;

        return function (this: any, ...args: any[]) {
            const before = patch.children.filter(c => c.type === "before");
            const insteads = patch.children.filter(c => c.type === "instead");
            const afters = patch.children.filter(c => c.type === "after");

            for (const child of before) {
                try {
                    withContext(child.caller, () => (child.callback as BeforeCallback)(this, args));
                } catch (err) {
                    logError(child, patch, err);
                }
            }

            // `instead` zinciri: her halka bir sonrakini "orijinal" olarak alıyor.
            const getPatch = (index: number): AnyFunction => {
                if (index >= insteads.length) {
                    return (...innerArgs: any[]) => patch.originalFunction.apply(this, innerArgs);
                }

                const child = insteads[index];
                return (...innerArgs: any[]) => {
                    try {
                        return withContext(child.caller, () =>
                            (child.callback as InsteadCallback)(this, innerArgs, getPatch(index + 1)));
                    } catch (err) {
                        logError(child, patch, err);
                        // Zincir kırılmasın: bir sonraki halkaya devam.
                        return getPatch(index + 1)(...innerArgs);
                    }
                };
            };

            let returnValue: any = getPatch(0)(...args);

            for (const child of afters) {
                try {
                    const result = withContext(child.caller, () =>
                        (child.callback as AfterCallback)(this, args, returnValue));
                    if (result !== undefined) returnValue = result;
                } catch (err) {
                    logError(child, patch, err);
                }
            }

            runOnceCleanup(patch);

            return returnValue;
        };
    }
}

function withContext<T>(caller: string, fn: () => T): T {
    const previous = currentPluginContext;
    currentPluginContext = caller;
    try {
        return fn();
    } finally {
        currentPluginContext = previous;
    }
}

function logError(child: ChildPatch, patch: Patch, err: unknown): void {
    recentPatchErrors.push({ caller: child.caller, at: Date.now(), error: err });
    if (recentPatchErrors.length > MAX_RECENT_ERRORS) recentPatchErrors.shift();

    logger.error(
        `${child.caller}: "${patch.displayName}.${patch.functionName}" üzerindeki ` +
        `${child.type} patch'i hata verdi:\n`,
        err
    );
}

const onceQueue = new Set<ChildPatch>();

function runOnceCleanup(patch: Patch): void {
    if (onceQueue.size === 0) return;

    for (const child of [...onceQueue]) {
        if (patch.children.includes(child)) {
            onceQueue.delete(child);
            child.unpatch();
        }
    }
}

/** `module → functionName → Patch` */
const patches = new Map<any, Map<string, Patch>>();

function getOrCreatePatch(module: any, functionName: string, displayName: string): Patch {
    let byName = patches.get(module);
    if (!byName) {
        byName = new Map();
        patches.set(module, byName);
    }

    let patch = byName.get(functionName);
    if (patch) return patch;

    patch = new Patch(module, functionName, displayName);
    byName.set(functionName, patch);
    return patch;
}

function makePatch(patch: Patch): void {
    if (patch.proxyFunction) return;

    const override = patch.makeOverride();
    patch.proxyFunction = override;
    patch.module[patch.functionName] = override;

    // ── Üç kimlik koruma satırı (plan §5.2) ──────────────────────────────────
    // `toString` override'ı kritik: Discord'un kendi kodu bazı yerlerde fonksiyon
    // kaynağına bakıyor ve **bizim `bySource` filtremiz de** öyle. Bu satır
    // olmadan sarmalanmış fonksiyonlar arama sonuçlarından düşüyor.
    Object.assign(patch.module[patch.functionName], patch.originalFunction);
    patch.module[patch.functionName].__originalFunction = patch.originalFunction;
    patch.module[patch.functionName].toString = () => patch.originalFunction.toString();
}

function pushChildPatch(
    caller: string,
    module: any,
    functionName: string,
    callback: PatchCallback,
    type: PatchType,
    options: PatchOptions = {}
): () => void {
    if (module == null) {
        logger.error(`${caller}: patch hedefi null — "${functionName}" atlandı.`);
        return () => { };
    }

    if (typeof module[functionName] !== "function") {
        logger.error(`${caller}: "${functionName}" bir fonksiyon değil, patch atlandı.`);
        return () => { };
    }

    const displayName = options.displayName
        ?? module.displayName
        ?? module.name
        ?? module.constructor?.displayName
        ?? module.constructor?.name
        ?? "Anonymous";

    const patch = getOrCreatePatch(module, functionName, displayName);

    const child: ChildPatch = {
        caller,
        type,
        id: nextPatchId++,
        callback,
        unpatch: () => {
            const index = patch.children.indexOf(child);
            if (index < 0) return;

            patch.children.splice(index, 1);

            // Son child kaldırıldığında orijinal fonksiyon geri konur ve kayıt
            // registry'den silinir. Sızıntı yok (plan §5.2).
            if (patch.children.length === 0) {
                patch.revert();
                patches.get(module)?.delete(functionName);
                if (patches.get(module)?.size === 0) patches.delete(module);
            }
        }
    };

    patch.children.push(child);
    if (options.once) onceQueue.add(child);

    makePatch(patch);

    return child.unpatch;
}

// ── Genel API ────────────────────────────────────────────────────────────────

export function before(
    caller: string, module: any, functionName: string,
    callback: BeforeCallback, options?: PatchOptions
): () => void {
    return pushChildPatch(caller, module, functionName, callback, "before", options);
}

export function instead(
    caller: string, module: any, functionName: string,
    callback: InsteadCallback, options?: PatchOptions
): () => void {
    return pushChildPatch(caller, module, functionName, callback, "instead", options);
}

export function after(
    caller: string, module: any, functionName: string,
    callback: AfterCallback, options?: PatchOptions
): () => void {
    return pushChildPatch(caller, module, functionName, callback, "after", options);
}

/** Bir plugin'in tüm patch'lerini kaldırır. Plugin durunca otomatik çağrılır (plan §5.3). */
export function unpatchAll(caller: string): void {
    for (const byName of [...patches.values()]) {
        for (const patch of [...byName.values()]) {
            for (const child of [...patch.children]) {
                if (child.caller === caller) child.unpatch();
            }
        }
    }
}

/** Hangi pluginlerin bu modül+fonksiyonu patch'lediği — çökme atıfı için. */
export function getPatchCallers(module: any, functionName: string): string[] {
    const patch = patches.get(module)?.get(functionName);
    return patch ? [...new Set(patch.children.map(c => c.caller))] : [];
}

/** Kayıtlı tüm patch'lerin özeti — reporter ve debug için. */
export function getPatchRegistry(): Array<{ displayName: string; functionName: string; callers: string[] }> {
    const result: Array<{ displayName: string; functionName: string; callers: string[] }> = [];

    for (const byName of patches.values()) {
        for (const patch of byName.values()) {
            result.push({
                displayName: patch.displayName,
                functionName: patch.functionName,
                callers: [...new Set(patch.children.map(c => c.caller))]
            });
        }
    }

    return result;
}
