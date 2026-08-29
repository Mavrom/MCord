/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import type * as ReactTypes from "react";

/**
 * Klasik JSX fabrikası (`jsxFactory: "McordCreateElement"`) kullandığımız için
 * global `JSX` ad alanı gerekli — @types/react 19 artık global tanımlamıyor.
 */
declare global {
    namespace JSX {
        type ElementType = ReactTypes.JSX.ElementType;
        type LibraryManagedAttributes<C, P> = ReactTypes.JSX.LibraryManagedAttributes<C, P>;

        interface Element extends ReactTypes.JSX.Element { }
        interface ElementClass extends ReactTypes.JSX.ElementClass { }
        interface ElementAttributesProperty extends ReactTypes.JSX.ElementAttributesProperty { }
        interface ElementChildrenAttribute extends ReactTypes.JSX.ElementChildrenAttribute { }
        interface IntrinsicAttributes extends ReactTypes.JSX.IntrinsicAttributes { }
        interface IntrinsicClassAttributes<T> extends ReactTypes.JSX.IntrinsicClassAttributes<T> { }
        interface IntrinsicElements extends ReactTypes.JSX.IntrinsicElements { }
    }
}

export { };
