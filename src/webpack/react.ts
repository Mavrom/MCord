/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import type * as ReactNamespace from "react";
import type * as ReactDOMNamespace from "react-dom";

import { byKeys } from "./filters";
import { find } from "./finder";

/**
 * Kendi React'imizi bundle etmiyoruz — Discord'unkini webpack'ten çekiyoruz.
 * Bundle boyutu ve hook uyumu için şart (plan §1, §11.3).
 */
let cachedReact: typeof ReactNamespace | null = null;
let cachedReactDOM: typeof ReactDOMNamespace | null = null;

export function getReact(): typeof ReactNamespace {
    cachedReact ??= find<typeof ReactNamespace>(
        byKeys(["createElement", "useState", "useEffect", "Fragment"]),
        { silent: true }
    );

    if (cachedReact == null) {
        throw new Error("[MCord] Discord'un React'i bulunamadı.");
    }

    return cachedReact;
}

export function getReactDOM(): typeof ReactDOMNamespace {
    cachedReactDOM ??= find<typeof ReactDOMNamespace>(
        byKeys(["createPortal", "flushSync"]),
        { silent: true }
    );

    if (cachedReactDOM == null) {
        throw new Error("[MCord] Discord'un ReactDOM'u bulunamadı.");
    }

    return cachedReactDOM;
}

/** Erişildiği anda çözülen React proxy'si — modül kapsamında kullanılabilir. */
export const React: typeof ReactNamespace = new Proxy({} as typeof ReactNamespace, {
    get: (_t, prop, receiver) => Reflect.get(getReact(), prop, receiver),
    has: (_t, prop) => Reflect.has(getReact(), prop),
    ownKeys: () => Reflect.ownKeys(getReact())
});

export const ReactDOM: typeof ReactDOMNamespace = new Proxy({} as typeof ReactDOMNamespace, {
    get: (_t, prop, receiver) => Reflect.get(getReactDOM(), prop, receiver),
    has: (_t, prop) => Reflect.has(getReactDOM(), prop),
    ownKeys: () => Reflect.ownKeys(getReactDOM())
});

/**
 * React "exotic" sarmalayıcılarını açıp en içteki fonksiyon bileşenini döndürür.
 *
 * Açma kuralları: `memo` → `.type`, `forwardRef` → `.render`,
 * `lazy` → çözülmüş `_result.default`.
 */
const EXOTIC = {
    memo: Symbol.for("react.memo"),
    forwardRef: Symbol.for("react.forward_ref"),
    lazy: Symbol.for("react.lazy")
} as const;

export function getType(elementType: any): any {
    while (true) {
        switch (elementType?.$$typeof) {
            case EXOTIC.memo:
                elementType = elementType.type;
                break;

            case EXOTIC.forwardRef:
                elementType = elementType.render;
                break;

            case EXOTIC.lazy: {
                const payload = elementType._payload;
                // `_status === 1` → çözülmüş. Çözülmemişse boş bileşen döndür.
                elementType = payload?._status === 1
                    ? payload._result?.default
                    : (() => null);
                break;
            }

            default:
                return elementType;
        }
    }
}

/** Cache'i temizler — reporter'ın tekrar tekrar arama yapması için. */
export function clearReactCache(): void {
    cachedReact = null;
    cachedReactDOM = null;
}
