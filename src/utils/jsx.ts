/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { getReact } from "../webpack/react";

/**
 * esbuild `inject` ile her renderer dosyasına eklenir; `jsxFactory` ve
 * `jsxFragment` bu adlara bakıyor (bkz. `scripts/build.mjs`).
 *
 * `createElement` çağrı anında çözülüyor: modül yüklenirken Discord'un React'i
 * henüz hazır olmayabilir.
 */
export function McordCreateElement(...args: any[]): any {
    return (getReact().createElement as any)(...args);
}

/** React 19'da Fragment tam olarak bu sembol — React'e ihtiyaç duymadan verilebilir. */
export const McordFragment: any = Symbol.for("react.fragment");
