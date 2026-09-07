/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import type { ReactNode } from "react";

/**
 * Hafif, saf-CSS ipucu balonu. Discord'un `Tooltip` bileşenine bağımlı değil
 * (o webpack araması sürüm kırılgan) — hover/focus'ta `::after` ile çiziliyor.
 * Stil `components/styles.ts` içinde `.mcord-tt` altında (kapsamsız, çünkü
 * mesaj/üye listesi dekorasyonları `.mcord-root` ağacının dışında render olur).
 */
export function Tooltip({ text, children }: { text: string; children: ReactNode }) {
    return (
        <span className="mcord-tt" data-mcord-tip={text} tabIndex={0}>
            {children}
        </span>
    );
}
