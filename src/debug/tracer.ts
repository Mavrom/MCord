/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Logger } from "../utils/logger";

const logger = new Logger("Tracer", "#ca9ee6");

export interface Trace {
    totalTime: number;
    args: unknown[];
}

/**
 * Başlangıç süresi ölçüm noktaları (plan §11.4).
 *
 *   enjeksiyon → webpack yakalama → tüm patch'ler → pluginler başladı
 *
 * Hedef: mod nedeniyle eklenen süre **< 200 ms**.
 */
export const traces: Record<string, Trace> = Object.create(null);

const pending = new Map<string, number>();

const noop = () => { };

export const beginTrace: (name: string, ...args: unknown[]) => void = !IS_DEV ? noop : (name, ...args) => {
    if (pending.has(name)) {
        logger.warn(`"${name}" izi zaten açık — önceki kapatılmamış.`);
        return;
    }

    traces[name] = { totalTime: -1, args };
    pending.set(name, performance.now());
};

export const finishTrace: (name: string) => number = !IS_DEV ? (() => -1) : name => {
    const start = pending.get(name);
    if (start === undefined) {
        logger.warn(`"${name}" izi açılmamıştı.`);
        return -1;
    }

    pending.delete(name);

    const totalTime = performance.now() - start;
    traces[name].totalTime = totalTime;

    logger.debug(`${name}: ${totalTime.toFixed(2)} ms`);
    return totalTime;
};

/** Bir fonksiyonu ölçülen sürümüyle sarar. */
export function traceFunction<F extends (...args: any[]) => any>(name: string, fn: F): F {
    if (!IS_DEV) return fn;

    return function (this: unknown, ...args: Parameters<F>) {
        beginTrace(name, ...args);
        try {
            return fn.apply(this, args);
        } finally {
            finishTrace(name);
        }
    } as F;
}

/** Toplanan tüm izlerin özeti — reporter çıktısına giriyor. */
export function getTraceSummary(): Array<{ name: string; totalTime: number }> {
    return Object.entries(traces)
        .map(([name, trace]) => ({ name, totalTime: trace.totalTime }))
        .sort((a, b) => b.totalTime - a.totalTime);
}
