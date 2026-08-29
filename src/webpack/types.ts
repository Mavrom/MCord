/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

export type ModuleExports = any;

export interface Module {
    id: PropertyKey;
    loaded: boolean;
    exports: ModuleExports;
}

export type ModuleFactory = (
    module: Module,
    exports: ModuleExports,
    require: AnyWebpackRequire
) => void;

export type PatchedModuleFactory = ModuleFactory & {
    $$mcordOriginal?: ModuleFactory;
    $$mcordPatchedSource?: string;
    $$mcordRequired?: boolean;
};

export interface WebpackRequire {
    (id: PropertyKey): ModuleExports;

    /** Modül fabrikaları — `id → factory` */
    m: Record<PropertyKey, PatchedModuleFactory>;
    /** Modül önbelleği — `id → Module` */
    c: Record<PropertyKey, Module>;

    /** defineExports: getter'ları hedefe tanımlar */
    d(target: ModuleExports, exports: Record<string, () => ModuleExports>): void;
    /** ensureChunk */
    e(chunkId: PropertyKey): Promise<void>;
    /** getChunkScriptFilename */
    u(chunkId: PropertyKey): string;
    /** bundlePath — ana instance'ta "/assets/" */
    p: string;
    /** onChunksLoaded */
    O: OnChunksLoaded;
    /** createFakeNamespaceObject */
    t(value: any, mode: number): any;
    /** compatGetDefaultExport */
    n(module: ModuleExports): () => ModuleExports;
    /** makeNamespaceObject */
    r(exports: ModuleExports): void;
    /** hasOwnProperty kısayolu */
    o(obj: object, prop: PropertyKey): boolean;

    /** chunk yükleme durumları */
    f: Record<string, (chunkId: PropertyKey, promises: Promise<void>[]) => void>;
    /** installedChunks */
    S?: Record<PropertyKey, unknown>;
}

export interface OnChunksLoaded {
    (result: any, chunkIds: PropertyKey[] | undefined, callback: () => any, priority: number): void;
    j?: (chunkId: PropertyKey) => boolean;
}

export type AnyWebpackRequire = Partial<WebpackRequire> &
    ((id: PropertyKey) => ModuleExports);

/** Modül export'u üzerinde çalışan filtre. */
export interface ModuleFilter {
    (exports: ModuleExports, module: Module, moduleId: PropertyKey): boolean;
    /** `wrapModuleFilter` sarmalaması öncesi orijinal filtre. */
    __originalFilter?: ModuleFilter;
    /** Reporter için: filtrenin adı ve argümanları. */
    [FilterSymbol]?: FilterMeta;
}

export interface FilterMeta {
    name: string;
    args: unknown[];
}

/**
 * Filtre metadata'sı bu sembol altında saklanır — reporter "hangi arama
 * başarısız oldu" mesajını okunabilir üretebilsin diye (plan §4.4).
 */
export const FilterSymbol = Symbol.for("MCord.Filter");

/** `wreq.m` içindeki ham fabrika kaynağını arayan filtre (henüz çalıştırılmamış modüller). */
export interface FactoryFilter {
    (factory: ModuleFactory, moduleId: PropertyKey): boolean;
    [FilterSymbol]?: FilterMeta;
}
