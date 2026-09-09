/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/**
 * Fabrika proxy'leme mantığı `intercept.ts`'e taşındı (kanıtlanmış açık-kaynak
 * `patchWebpack.ts` tek dosyada tutuyor). Bu dosya geriye dönük uyum için
 * yeniden dışa aktarım.
 */

export {
    configureEagerPatching,
    isEagerPatching,
    setFactoryPatcher
} from "./intercept";
