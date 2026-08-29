/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Logger } from "../utils/logger";
import { getReact, getType } from "../webpack/react";

const logger = new Logger("Patcher:Node", "#a6d189");

export type NodeCallback = (props: any, result: any, instance?: any) => any;

/** React'in taşıması gereken statik alanlar (BD ile aynı liste). */
const STATIC_PROPS = ["defaultProps", "displayName", "propTypes"] as const;

/**
 * React bileşen sarma (plan §5.4).
 *
 * React 19'un tüm bileşen türlerini doğru ele alır: sınıf bileşeni, fonksiyon
 * bileşeni (async dönüş dahil), `memo`, `forwardRef`, `lazy`.
 *
 * Sarma stratejisi: `getType` ile memo/forwardRef/lazy sarmalayıcıları
 * **açılır**, en içteki fonksiyon bir kez sarılır, sonra aynı sarmalayıcılar
 * tekrar uygulanır. Özyinelemeli sarma iç içe katman üretiyor ve `lazy`
 * protokolünü bozuyordu.
 *
 * Tek bir bileşene birden fazla patch atılabilmesi tasarımın parçası:
 * framework seviyesinde her plugin'e otomatik instance veriliyor
 * (bkz. `boundPatcher.ts`) ve aynı bileşene birden fazla plugin patch atarsa
 * `chainedNodePatch` zincirlemeyi hallediyor.
 */
export class NodePatcher {
    /**
     * Aynı tip iki kez sarılmıyor. Hem orijinal→yeni hem yeni→yeni eşlemesi
     * yapılıyor; bunlar olmadan React her render'da yeni bir bileşen tipi
     * görüyor → tam remount → state kaybı, animasyon sıfırlanması, performans
     * çöküşü. **Bu dosyanın en kritik satırları bunlar.**
     */
    readonly #cache = new WeakMap<any, any>();
    readonly #id: symbol;
    #destroyed = false;

    constructor(readonly name: string) {
        this.#id = Symbol(`MCord.NodePatcher.${name}`);
    }

    get destroyed(): boolean {
        return this.#destroyed;
    }

    /** Sarmalayıcıyı devre dışı bırakır: ağaçtaki bileşenler orijinali geçirir. */
    destroy(): void {
        this.#destroyed = true;
    }

    isPatched(type: any): boolean {
        return type != null && type[this.#id] != null;
    }

    /** BD imzası: bir React elemanının `type`'ını **yerinde** değiştirir. */
    patchNode(node: { type: any }, callback: NodeCallback): void {
        if (this.#destroyed || node?.type == null) return;
        node.type = this.patch(node.type, callback);
    }

    /** Sarılmış tipi döndürür (zincirleme için bu biçim kullanılıyor). */
    patch(type: any, callback: NodeCallback): any {
        if (this.#destroyed || type == null) return type;

        const cached = this.#cache.get(type);
        if (cached) return cached;

        // Tip daha önce bu patcher tarafından sarılmışsa işareti üzerinde durur.
        if (type[this.#id]) return type[this.#id];

        const newType = this.#build(type, callback);
        if (newType == null) return type;

        this.#cache.set(type, newType);
        this.#cache.set(newType, newType);

        try {
            Object.defineProperty(newType, this.#id, {
                value: newType, enumerable: false, configurable: true
            });
        } catch { /* donmuş tip — işaret koyamıyoruz, cache yeterli */ }

        return newType;
    }

    #build(type: any, callback: NodeCallback): any {
        const isDestroyed = () => this.#destroyed;
        const name = this.name;

        // 1. Sınıf bileşeni → extend + render override
        if (type.prototype?.isReactComponent) {
            class ComponentType extends (type as { new(...args: any[]): any }) {
                render() {
                    const res = super.render();
                    if (isDestroyed()) return res;

                    try {
                        const ret = callback(this.props, res, this);
                        return typeof ret === "undefined" ? res : ret;
                    } catch (err) {
                        logger.error(`${name}: sınıf bileşeni patch'i hata verdi:\n`, err);
                        return res;
                    }
                }
            }

            copyStatics(type, ComponentType);
            return ComponentType;
        }

        // 2. En içteki fonksiyon bileşenini aç ve **bir kez** sar.
        const FC = getType(type);

        if (typeof FC !== "function") {
            logger.warn(`${name}: desteklenmeyen bileşen türü, patch atlandı.`, type);
            return null;
        }

        function FunctionType(this: any, ...args: any[]) {
            const res = FC.apply(this, args);

            // React 19'da ref props içinde; eski imzada ikinci argüman.
            const props = args.length === 1 ? args[0] : Object.assign({ ref: args[1] }, args[0]);

            const apply = (value: any) => {
                if (isDestroyed()) return value;

                try {
                    const ret = callback(props, value);
                    return typeof ret === "undefined" ? value : ret;
                } catch (err) {
                    logger.error(`${name}: fonksiyon bileşeni patch'i hata verdi:\n`, err);
                    return value;
                }
            };

            // React 19 async bileşeni
            if (res instanceof Promise) return res.then(apply);
            return apply(res);
        }

        // 3. Açılan sarmalayıcıları geri uygula.
        const React = getReact();
        let newType: any = FunctionType;

        if (typeof type === "object") {
            const t = type as any;

            if (t.type) {
                newType = React.memo(
                    t.type?.render ? React.forwardRef(newType) : newType,
                    t.compare
                );
            } else if (t.render) {
                newType = React.forwardRef(newType);
            } else if (t._payload) {
                newType = React.lazy(() => {
                    // React lazy protokolü: `_init(_payload)` — `_payload` bir
                    // promise değil, `{_status,_result}` durum nesnesi.
                    const out = t._init(t._payload);

                    const handle = (component: any) => this.patch(component, callback);

                    if (out instanceof Promise) {
                        return out.then((mod: any) => ({ default: handle(mod?.default ?? mod) }));
                    }

                    return Promise.resolve({ default: handle(out) });
                });
            }
        }

        copyStatics(type, newType);
        return newType;
    }
}

/** Statik property'leri descriptor'larıyla birlikte taşır. */
function copyStatics(from: any, to: any): void {
    for (const propName of STATIC_PROPS) {
        const descriptor = Object.getOwnPropertyDescriptor(from, propName);
        if (descriptor) {
            try {
                Object.defineProperty(to, propName, descriptor);
            } catch { /* yazılamıyorsa atla */ }
        }
    }
}

/**
 * Aynı bileşene birden fazla plugin patch atabilsin diye zincirleme katmanı
 * (plan §5.4).
 *
 * BD'nin yorumu: *"This does not allow 2 different things to patch 1 thing!"*
 * Her plugin kendi `NodePatcher` instance'ını kullanıyor; bu fonksiyon
 * sarmalamaları ekleme sırasına göre üst üste bindiriyor.
 */
export function chainedNodePatch(
    type: any,
    entries: Array<{ patcher: NodePatcher; callback: NodeCallback }>
): any {
    return entries.reduce(
        (currentType, { patcher, callback }) => patcher.patch(currentType, callback),
        type
    );
}
