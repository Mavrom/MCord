/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Logger } from "../utils/logger";
import { patchThisInstance } from "./proxy";
import type { AnyWebpackRequire, Module, ModuleExports, ModuleFactory, WebpackRequire } from "./types";

export const logger = new Logger("Webpack", "#8caaee");

/** Ana webpack instance'ı. Yakalanana kadar `null`. */
export let wreq: WebpackRequire = null!;
/** `wreq.c` — modül önbelleği. */
export let cache: WebpackRequire["c"] = null!;

/** Yakalanan tüm webpack instance'ları (ana instance dahil). */
export const allWebpackInstances = new Set<AnyWebpackRequire>();

let resolveReady!: () => void;
/** Ana instance yakalandığında çözülür. */
export const onceReady = new Promise<void>(resolve => { resolveReady = resolve; });

/**
 * Bir modül *çalıştırıldığında* export'u üzerinde çalışan dinleyiciler.
 * `waitFor` / `getLazy` bunları kullanır (bkz. `lazy.ts`).
 */
export const moduleListeners = new Set<(exports: ModuleExports, module: Module) => void>();

/**
 * Yeni bir fabrika `wreq.m`'e eklendiğinde çalışan dinleyiciler.
 * Modül henüz çalıştırılmadığı için sadece kaynağa bakabilirler.
 */
export const factoryListeners = new Set<(factory: ModuleFactory, moduleId: PropertyKey) => void>();

/**
 * Reporter kaydı: her tembel arama tipi ve argümanlarıyla buraya yazılır.
 * CI koşusunda hepsi yeniden çalıştırılıp `null` dönenler raporlanır (plan §9.1).
 */
export const lazyWebpackSearchHistory: Array<[string, unknown[]]> = [];

export function _initWebpack(instance: WebpackRequire): void {
    if (wreq != null) return;

    wreq = instance;
    cache = instance.c;
    resolveReady();

    logger.info("Ana webpack instance'ı yakalandı.");
}

const define: typeof Object.defineProperty = (target, prop, descriptor) =>
    Object.defineProperty(target, prop, { configurable: true, writable: true, ...descriptor });

/**
 * Discord içinde birden fazla webpack instance'ı var (Sentry, libdiscore,
 * fast-connect, tarayıcı eklentileri). Bunlardan yanlışını patch'lersek ana
 * instance'ın başlatılması bozulur — bu yüzden üç aşamalı eleme (plan §4.1).
 */
const BLACKLISTED_ASSETS = ["sentry", "libdiscore", "fast-connect"];

/**
 * Katman 2 — Yakalama.
 *
 * Discord webpack'i başlatırken `wreq.m = {...}` yapıyor. `Function.prototype`
 * üzerinde `m` için setter tanımlayarak bunu **ilk atandığı anda** yakalıyoruz.
 * Alternatif olan `webpackChunkdiscord_app.push` kancası chunk push'unu
 * beklemek demek — bu noktadan daha geç, erken modüller gözden kaçıyor.
 */
export function initWebpackIntercept(): void {
    define(Function.prototype, "m", {
        enumerable: false,

        set(this: AnyWebpackRequire, originalModules: WebpackRequire["m"]) {
            // Kendi setter'ımızı hemen ez — bu instance için bir daha çalışmasın.
            define(this, "m", { value: originalModules });

            // ── Aşama 1: stack trace şekli ─────────────────────────────────
            const { stack } = new Error();
            if (
                !stack?.includes("http")
                || stack.match(/at \d+? \(/)
                || !String(this).includes("exports:{}")
            ) return;

            // ── Aşama 2: asset dosya adı kara listesi ──────────────────────
            const fileName = stack.match(/\/assets\/(.+?\.js)/)?.[1];
            if (BLACKLISTED_ASSETS.some(name => fileName?.toLowerCase()?.includes(name))) return;

            logger.debug(`Webpack instance adayı yakalandı: ${fileName ?? "<bilinmeyen>"}`);
            allWebpackInstances.add(this);

            // ── Aşama 3: bundlePath ("/assets/") kontrolü ──────────────────
            // `wreq.p` ve `wreq.O` setter'ları, ikisinden biri tetiklendiğinde
            // instance'ı patch'lemek için kuruluyor.
            let patched = false;

            const tryPatch = () => {
                if (patched) return;
                patched = true;
                patchThisInstance.call(this);
            };

            define(this, "p", {
                enumerable: false,
                set(this: AnyWebpackRequire, bundlePath: string) {
                    define(this, "p", { value: bundlePath });

                    // `this.u` regex'i libdiscore'un init instance'ını eliyor —
                    // o instance chunk dosya adı için sabit string döndürüyor.
                    if (
                        bundlePath !== "/assets/"
                        || /(?:=>|{return)"[^"]+?"[^=]/.exec(String(this.u))
                    ) return;

                    if (wreq == null && this.c != null) _initWebpack(this as WebpackRequire);
                    tryPatch();
                }
            });

            define(this, "O", {
                enumerable: false,
                set(this: AnyWebpackRequire, onChunksLoaded: WebpackRequire["O"]) {
                    define(this, "O", { value: onChunksLoaded });

                    if (this.p !== "/assets/") return;
                    if (wreq == null && this.c != null) _initWebpack(this as WebpackRequire);
                    tryPatch();
                }
            });

            // Temizlik: setter'lar tetiklenmediyse sil, `Function.prototype`'ı
            // ve instance'ı kirli bırakma (plan §4.1).
            setTimeout(() => {
                if (!Object.getOwnPropertyDescriptor(this, "p")?.value) {
                    delete (this as any).p;
                }
                if (!Object.getOwnPropertyDescriptor(this, "O")?.value) {
                    delete (this as any).O;
                }
            }, 0);
        }
    });
}

/**
 * Bir modül fabrikasını *tüm* yakalanmış instance'larda günceller.
 *
 * Bellek optimizasyonu için kritik: fabrika çalıştıktan sonra proxy yerine
 * orijinali geri koyuyoruz, proxy çöp toplayıcıya bırakılıyor (plan §4.2, §11.2).
 */
export function defineInWebpackInstances(moduleId: PropertyKey, factory: ModuleFactory): void {
    for (const instance of allWebpackInstances) {
        if (instance.m == null) continue;
        define(instance.m, moduleId, { value: factory, enumerable: false });
    }
}
