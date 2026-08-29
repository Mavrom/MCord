/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

export type PatchType = "before" | "instead" | "after";

export type AnyFunction = (...args: any[]) => any;

/** Orijinal fonksiyondan **önce** çalışır; `args`'ı yerinde değiştirebilir. */
export type BeforeCallback = (thisObject: any, args: any[]) => void;

/**
 * Orijinal fonksiyonun **yerine** çalışır. `original` bir sonraki `instead`
 * halkası (yoksa gerçek orijinal fonksiyon) — zincirleme bu şekilde kuruluyor.
 */
export type InsteadCallback = (thisObject: any, args: any[], original: AnyFunction) => any;

/** Orijinal fonksiyondan **sonra** çalışır; dönüş değerini değiştirebilir. */
export type AfterCallback = (thisObject: any, args: any[], returnValue: any) => any;

export type PatchCallback = BeforeCallback | InsteadCallback | AfterCallback;

export interface ChildPatch {
    /** Patch'i kim ekledi — plugin adı. Çökme atıfı bunun üzerinden yapılıyor. */
    caller: string;
    type: PatchType;
    id: number;
    callback: PatchCallback;
    unpatch(): void;
}

export interface PatchOptions {
    /** Ayırt edici ad — aynı caller birden fazla patch atarsa loglarda ayrışsın. */
    displayName?: string;
    /** Patch bir kez çalıştıktan sonra kendini kaldırsın. */
    once?: boolean;
}
