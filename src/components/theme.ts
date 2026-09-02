/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import type { CSSProperties } from "react";

/**
 * Tasarım token'ları.
 *
 * **Her renk Discord'un kendi CSS değişkeninden geliyor.** Böylece kullanıcının
 * teması (açık, koyu, OLED/AMOLED, özel temalar) neyse arayüz ona uyuyor —
 * ayrı bir tema sistemi tutmuyoruz (plan §0.2 kapsam dışı).
 *
 * Fallback'ler yalnızca değişken hiç tanımlı değilse devreye giriyor.
 */
export const c = {
    // Metin
    text: "var(--text-default, var(--text-normal, #dbdee1))",
    muted: "var(--text-muted, #949ba4)",
    faint: "var(--text-tertiary, var(--text-muted, #80848e))",
    heading: "var(--header-primary, #f2f3f5)",
    onAccent: "var(--white-500, #fff)",

    // Yüzeyler — açıktan koyuya doğru katmanlar
    surface: "var(--background-base-lower, var(--background-primary, #313338))",
    surfaceRaised: "var(--background-base-low, var(--background-secondary, #2b2d31))",
    surfaceOverlay: "var(--background-surface-higher, var(--background-floating, #111214))",
    surfaceHover: "var(--background-modifier-hover, rgba(255, 255, 255, .04))",
    surfaceActive: "var(--background-modifier-selected, rgba(255, 255, 255, .08))",
    inputBg: "var(--input-background, rgba(0, 0, 0, .25))",

    // Çizgiler
    border: "var(--border-subtle, var(--background-modifier-accent, rgba(255, 255, 255, .08)))",
    borderStrong: "var(--border-normal, rgba(255, 255, 255, .16))",

    // Anlamsal
    accent: "var(--brand-500, #5865f2)",
    accentHover: "var(--brand-560, #4752c4)",
    danger: "var(--status-danger, #da373c)",
    success: "var(--green-360, #23a55a)",
    warning: "var(--yellow-300, #f0b232)"
} as const;

/** Boşluk ölçeği — 4'ün katları, göz ritmini tutarlı tutuyor. */
export const space = { xs: "4px", sm: "8px", md: "12px", lg: "16px", xl: "24px" } as const;

export const radius = { sm: "6px", md: "8px", lg: "12px", pill: "999px" } as const;

export const shadow = {
    low: "0 1px 2px rgba(0, 0, 0, .18)",
    mid: "0 4px 12px rgba(0, 0, 0, .24)",
    high: "0 16px 48px rgba(0, 0, 0, .40)"
} as const;

export const motion = "140ms cubic-bezier(.2, .7, .3, 1)";

export const s = {
    page: {
        display: "flex",
        flexDirection: "column",
        gap: space.lg,
        color: c.text,
        fontFamily: "var(--font-primary, 'gg sans', 'Segoe UI', system-ui, sans-serif)",
        fontSize: "14px",
        lineHeight: 1.45,
        minWidth: 0
    },

    // ── Tipografi ────────────────────────────────────────────────────────────
    h1: { margin: 0, color: c.heading, fontSize: "20px", fontWeight: 700, letterSpacing: "-.01em" },
    h2: { margin: 0, color: c.heading, fontSize: "15px", fontWeight: 600 },
    muted: { color: c.muted, fontSize: "13px", margin: 0 },
    faint: { color: c.faint, fontSize: "12px", margin: 0 },

    // ── Yüzeyler ─────────────────────────────────────────────────────────────
    card: {
        display: "flex",
        flexDirection: "column",
        gap: space.sm,
        padding: space.md,
        borderRadius: radius.md,
        background: c.surfaceRaised,
        border: `1px solid ${c.border}`,
        boxShadow: shadow.low,
        transition: `border-color ${motion}, background ${motion}, transform ${motion}`,
        minWidth: 0
    },
    panel: {
        padding: space.lg,
        borderRadius: radius.lg,
        background: c.surfaceRaised,
        border: `1px solid ${c.border}`
    },

    // ── Yerleşim ─────────────────────────────────────────────────────────────
    row: { display: "flex", alignItems: "center", gap: space.sm, minWidth: 0 },
    spread: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: space.sm, minWidth: 0 },
    // `minmax(0, …)` kritik: 260px sabit alt sınır yatay scrollbar'a yol açıyordu.
    grid: {
        display: "grid",
        gap: space.md,
        gridTemplateColumns: "repeat(auto-fill, minmax(min(260px, 100%), 1fr))",
        alignItems: "stretch",
        minWidth: 0
    },

    // ── Girdiler ─────────────────────────────────────────────────────────────
    input: {
        width: "100%",
        boxSizing: "border-box",
        padding: "10px 12px",
        borderRadius: radius.sm,
        border: `1px solid ${c.border}`,
        background: c.inputBg,
        color: c.text,
        fontSize: "14px",
        outline: "none",
        transition: `border-color ${motion}, background ${motion}`
    },

    // ── Düğmeler ─────────────────────────────────────────────────────────────
    button: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: space.xs,
        padding: "8px 14px",
        borderRadius: radius.sm,
        border: "1px solid transparent",
        cursor: "pointer",
        fontSize: "13px",
        fontWeight: 600,
        fontFamily: "inherit",
        color: c.onAccent,
        background: c.accent,
        transition: `background ${motion}, border-color ${motion}, color ${motion}`,
        whiteSpace: "nowrap"
    },
    buttonSecondary: {
        background: "transparent",
        color: c.text,
        border: `1px solid ${c.border}`
    },
    buttonGhost: {
        background: "transparent",
        color: c.muted,
        border: "1px solid transparent"
    },
    buttonDanger: { background: c.danger, color: c.onAccent, border: "1px solid transparent" },

    // ── Rozetler / etiketler ─────────────────────────────────────────────────
    badge: {
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 7px",
        borderRadius: radius.pill,
        fontSize: "10px",
        fontWeight: 700,
        letterSpacing: ".04em",
        textTransform: "uppercase",
        whiteSpace: "nowrap"
    },
    tag: {
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: radius.pill,
        background: c.surfaceHover,
        border: `1px solid ${c.border}`,
        color: c.faint,
        fontSize: "11px",
        whiteSpace: "nowrap"
    },

    code: {
        margin: 0,
        padding: space.md,
        borderRadius: radius.sm,
        background: c.inputBg,
        border: `1px solid ${c.border}`,
        fontFamily: "var(--font-code, ui-monospace, Consolas, monospace)",
        fontSize: "12px",
        overflow: "auto"
    }
} satisfies Record<string, CSSProperties>;

/** Yumuşak renk zemini — rozetlerde solid renk yerine kullanılıyor (daha az bağırıyor). */
export function tint(color: string, alpha = ".16"): CSSProperties {
    return {
        background: `color-mix(in srgb, ${color} ${Number(alpha) * 100}%, transparent)`,
        color,
        border: `1px solid color-mix(in srgb, ${color} 32%, transparent)`
    };
}
