/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { _patchContextMenu } from "../../../api/contextMenu";
import { Devs } from "../../../utils/constants";
import { Logger } from "../../../utils/logger";
import { definePlugin } from "../../../utils/types";
import { ContextMenuApi } from "../../../webpack/common";

const logger = new Logger("ContextMenuAPI", "#f4b8e4");

export default definePlugin({
    name: "ContextMenuAPI",
    description: "Plugin'lerin Discord bağlam menülerine öğe eklemesini sağlar",
    authors: [Devs.MCord],
    required: true,

    /**
     * Kod patch'i yerine fonksiyon patch'i: `openContextMenu`'ye verilen render
     * fonksiyonunu sarıyoruz. Menü render edildiğinde ortaya çıkan props'a
     * kayıtlı patch'ler uygulanıyor (plan §5.1).
     */
    start() {
        // `openContextMenu` mangle edilmiş bir property; anahtar araması
        // çalışmaz, modül kaynağından mapper'la çözülüyor (plan §4.7).
        if (typeof ContextMenuApi?.openContextMenu !== "function") {
            throw new Error("ContextMenuApi çözümlenemedi.");
        }

        this.patcher.before(ContextMenuApi, "openContextMenu", (self, args) => {
            const render = args[1];
            if (typeof render !== "function") return;

            args[1] = (...renderArgs: unknown[]) => {
                const element = render(...renderArgs);
                if (element?.type == null) return element;

                // Menü bileşenini plugin'e bağlı NodePatcher ile sarıyoruz;
                // aynı tip iki kez sarılmıyor (WeakMap cache, plan §5.4).
                const patchedType = this.patcher.patchNode(element.type, (_props, result) => {
                    try {
                        if (result?.props) _patchContextMenu(result.props);
                    } catch (err) {
                        logger.error("Bağlam menüsü patch'i uygulanamadı:\n", err);
                    }
                    return result;
                });

                return patchedType === element.type
                    ? element
                    : { ...element, type: patchedType };
            };
        });
    }
});
