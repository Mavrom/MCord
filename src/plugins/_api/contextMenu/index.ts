/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { _patchContextMenu } from "../../../api/contextMenu";
import { Devs } from "../../../utils/constants";
import { Logger } from "../../../utils/logger";
import { definePlugin } from "../../../utils/types";
import { bySource } from "../../../webpack/filters";
import { requireModule } from "../../../webpack/finder";
import { factoryListeners, wreq } from "../../../webpack/intercept";
import { waitFor } from "../../../webpack/lazy";
import type { ModuleExports } from "../../../webpack/types";

const logger = new Logger("ContextMenuAPI", "#f4b8e4");
const MODULE_MARKER = 'type:"CONTEXT_MENU_OPEN"';
let cancelModuleWait: (() => void) | undefined;
let cancelFactoryWait: (() => void) | undefined;

interface ContextMenuFunctions {
    module: Record<string, any>;
    openKey: string;
    openLazyKey?: string;
}

function findMenuProps(node: any, sourceProps: Record<string, any>): Record<string, any> | undefined {
    if (node == null) return;

    if (Array.isArray(node)) {
        for (const child of node) {
            const found = findMenuProps(child, sourceProps);
            if (found) return found;
        }
        return;
    }

    const props = node?.props;
    if (props == null) return;
    if (typeof props.navId === "string") {
        // Bazı menülerde (ör. `expression-picker`) `children` tek bir eleman ya
        // da fonksiyon — patch'ler diziye `push` yapıyor. Menü node'unun kendi
        // `props.children`'ını yerinde diziye çeviriyoruz ki değişiklik render'a
        // yansısın.
        if (!Array.isArray(props.children)) {
            try {
                props.children = props.children == null ? [] : [props.children];
            } catch {
                return; // props donmuş — dokunamıyoruz, patch'i atla
            }
        }
        return { ...sourceProps, ...props };
    }

    return findMenuProps(props.children, sourceProps);
}

function findContextMenuFunctions(exports: ModuleExports): ContextMenuFunctions | undefined {
    if (exports == null || (typeof exports !== "object" && typeof exports !== "function")) return;

    let openKey: string | undefined;
    let openLazyKey: string | undefined;

    for (const [key, value] of Object.entries(exports)) {
        if (typeof value !== "function") continue;

        const source = Function.prototype.toString.call(value);
        if (source.includes("renderLazy:") && source.includes("new DOMRect(")) {
            openKey = key;
        } else if (source.includes("void 0") && source.length < 160) {
            openLazyKey = key;
        }
    }

    if (openKey) return { module: exports as Record<string, any>, openKey, openLazyKey };
}

export default definePlugin({
    name: "ContextMenuAPI",
    description: "Plugin'lerin Discord bağlam menülerine öğe eklemesini sağlar",
    authors: [Devs.MCord],
    required: true,

    start() {
        let bound = false;
        const bind = (exports: ModuleExports) => {
            if (bound) return;

            const match = findContextMenuFunctions(exports);
            if (!match) {
                logger.warn("ContextMenuApi bulundu ancak açma fonksiyonu çözümlenemedi.");
                return;
            }

            const wrapRender = (render: (...args: unknown[]) => any) =>
                (...renderArgs: unknown[]) => {
                    const element = render(...renderArgs);
                    if (element?.type == null) return element;

                    const patchedType = this.patcher.patchNode(element.type, (_props, result) => {
                        try {
                            const menuProps = findMenuProps(result, _props);
                            if (menuProps) _patchContextMenu(menuProps);
                        } catch (err) {
                            logger.error("Bağlam menüsü patch'i uygulanamadı:\n", err);
                        }
                        return result;
                    });

                    return patchedType === element.type
                        ? element
                        : { ...element, type: patchedType };
                };

            this.patcher.before(match.module, match.openKey, (_self, args) => {
                const render = args[1];
                if (typeof render === "function") args[1] = wrapRender(render);
            });

            if (match.openLazyKey) {
                this.patcher.before(match.module, match.openLazyKey, (_self, args) => {
                    const loadRender = args[1];
                    if (typeof loadRender !== "function") return;

                    args[1] = async (...loadArgs: unknown[]) => {
                        const render = await loadRender(...loadArgs);
                        return typeof render === "function" ? wrapRender(render) : render;
                    };
                });
            }

            bound = true;
            cancelFactoryWait?.();
        };

        cancelModuleWait = waitFor(bySource(MODULE_MARKER), bind);

        const onFactory = (factory: Function, moduleId: PropertyKey) => {
            if (bound || !String(factory).includes(MODULE_MARKER)) return;

            queueMicrotask(() => {
                const exports = requireModule(moduleId);
                if (exports) bind(exports);
            });
        };
        factoryListeners.add(onFactory);
        cancelFactoryWait = () => factoryListeners.delete(onFactory);

        for (const moduleId of Reflect.ownKeys(wreq.m)) {
            const factory = wreq.m[moduleId as any];
            if (factory) onFactory(factory, moduleId);
            if (bound) break;
        }
    },

    stop() {
        cancelModuleWait?.();
        cancelFactoryWait?.();
        cancelModuleWait = undefined;
        cancelFactoryWait = undefined;
    }
});
