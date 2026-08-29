/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { after, before, instead, unpatchAll } from "./functionPatcher";
import { type NodeCallback,NodePatcher } from "./nodePatcher";
import type { AfterCallback, BeforeCallback, InsteadCallback, PatchOptions } from "./types";

/**
 * Plugin'e bağlı patcher (plan §5.3).
 *
 * BD'de `BdApi.Patcher` iki formda: statik (her çağrıda `caller` string'i vermek
 * zorunlu) ve plugin'e bağlı. **Bizde sadece bağlı formu var** — `caller`
 * otomatik, unutulamıyor.
 *
 * Plugin durdurulduğunda `PluginManager` `destroy()` çağırıyor; `unpatchAll` ve
 * `nodePatcher.destroy()` framework tarafından hallediliyor, plugin yazarının
 * sorumluluğunda değil. BD'de bu manuel ve sık unutuluyor → sızıntı.
 */
export class BoundPatcher {
    readonly nodePatcher: NodePatcher;

    /** Bu plugin'in eklediği tüm unpatch fonksiyonları. */
    readonly #unpatchers = new Set<() => void>();

    constructor(readonly pluginName: string) {
        this.nodePatcher = new NodePatcher(pluginName);
    }

    before(module: any, functionName: string, callback: BeforeCallback, options?: PatchOptions): () => void {
        return this.#track(before(this.pluginName, module, functionName, callback, options));
    }

    instead(module: any, functionName: string, callback: InsteadCallback, options?: PatchOptions): () => void {
        return this.#track(instead(this.pluginName, module, functionName, callback, options));
    }

    after(module: any, functionName: string, callback: AfterCallback, options?: PatchOptions): () => void {
        return this.#track(after(this.pluginName, module, functionName, callback, options));
    }

    /** React bileşeni sar — plugin'in kendi `NodePatcher` instance'ı üzerinden. */
    patchNode(type: any, callback: NodeCallback): any {
        return this.nodePatcher.patch(type, callback);
    }

    #track(unpatch: () => void): () => void {
        const wrapped = () => {
            this.#unpatchers.delete(wrapped);
            unpatch();
        };
        this.#unpatchers.add(wrapped);
        return wrapped;
    }

    /** Plugin durdurulduğunda `PluginManager` tarafından otomatik çağrılır. */
    destroy(): void {
        for (const unpatch of [...this.#unpatchers]) {
            try {
                unpatch();
            } catch { /* zaten kaldırılmış olabilir */ }
        }
        this.#unpatchers.clear();

        // Güvenlik ağı: `#track` dışından eklenmiş patch kalmışsa da temizle.
        unpatchAll(this.pluginName);
        this.nodePatcher.destroy();
    }
}
