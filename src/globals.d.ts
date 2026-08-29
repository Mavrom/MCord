/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/** Build zamanında esbuild `define` ile sabitlenen bayraklar. */
declare const IS_DEV: boolean;
declare const IS_REPORTER: boolean;
declare const IS_MAIN: boolean;
declare const IS_PRELOAD: boolean;
declare const IS_RENDERER: boolean;

declare const VERSION: string;
declare const BUILD_TIMESTAMP: number;
declare const COMMIT_HASH: string;

/** JSX — Discord'un React'i runtime'da bağlanır (plan §11.3). */
declare const McordCreateElement: typeof import("react").createElement;
declare const McordFragment: typeof import("react").Fragment;

declare module "~plugins" {
    // Faz 5'te `PluginDef` ile daraltılacak.
    const plugins: Record<string, any>;
    export default plugins;
}

interface Window {
    /** `preload.ts` tarafından `contextBridge` ile açılan yüzey. */
    McordNative: import("./shared/nativeBridge").McordNative;
}

declare module "~fileContent/*" {
    const content: string;
    export default content;
}
