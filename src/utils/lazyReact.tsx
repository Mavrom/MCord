/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import type { ComponentType } from "react";

import { React } from "../webpack/react";
import { makeLazy } from "./lazy";

/**
 * Kanıtlanmış açık-kaynak istemcinin (Vencord) `src/utils/lazyReact.tsx`'inin
 * portu.
 *
 * **Bileşenler `proxyLazy` ile sarılmaz.** MCord bunu yapıyordu ve React
 * bileşeni çağırınca Proxy'nin `apply` tuzağı devreye girip
 * `Function.prototype.apply was called on #<Object>` hatası veriyordu — çözülen
 * değer `forwardRef`/`memo` gibi bir **nesne**, fonksiyon değil. MC butonu bu
 * yüzden hiç render edilmiyordu (hata `ErrorBoundary`'de sessizce yutuluyordu).
 *
 * Doğrusu: gerçek bir fonksiyon bileşeni döndürüp ilk render'da çözmek.
 */
const NoopComponent = () => null;

export type LazyComponentWrapper<C> = C & { $$mcordGetWrappedComponent(): C; };

/**
 * Tembel bileşen — fabrika ilk **render**'da çağrılır.
 *
 * @param attempts bileşen alınamazsa kaç kez yeniden denensin
 */
export function LazyComponent<T extends object = any>(
    factory: () => ComponentType<T>,
    attempts = 5
): LazyComponentWrapper<ComponentType<T>> {
    const get = makeLazy(factory, attempts);

    const LazyComponent = (props: T) => {
        const Component = get() ?? NoopComponent;
        return React.createElement(Component as any, props);
    };

    LazyComponent.$$mcordGetWrappedComponent = get;

    return LazyComponent as LazyComponentWrapper<ComponentType<T>>;
}
