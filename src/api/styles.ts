/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/**
 * Plugin'in yönettiği stil enjeksiyonu (plan §2).
 *
 * **Kullanıcı CSS'i / QuickCSS değil** — o özellik bilinçli olarak kapsam dışı
 * (plan §0.2). Burada sadece plugin'in kendi bileşenleri için gereken, derleme
 * zamanında bilinen stiller var.
 */

const styleElements = new Map<string, HTMLStyleElement>();

export function enableStyle(id: string, css: string): void {
    if (styleElements.has(id)) return;

    const element = document.createElement("style");
    element.id = `mcord-style-${id}`;
    element.textContent = css;
    document.head.appendChild(element);

    styleElements.set(id, element);
}

export function disableStyle(id: string): boolean {
    const element = styleElements.get(id);
    if (!element) return false;

    element.remove();
    styleElements.delete(id);
    return true;
}

export function isStyleEnabled(id: string): boolean {
    return styleElements.has(id);
}
