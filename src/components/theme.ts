/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import type { CSSProperties } from "react";

/**
 * Paylaşılan stil sabitleri.
 *
 * Kullanıcı CSS'i / tema sistemi kapsam dışı (plan §0.2); burada sadece kendi
 * ayar arayüzümüzün ihtiyaç duyduğu, derleme zamanında bilinen stiller var.
 * Discord'un CSS değişkenlerini kullanıyoruz ki koyu/açık temayla uyumlu olsun.
 */
export const c = {
    text: "var(--text-normal, #dbdee1)",
    muted: "var(--text-muted, #949ba4)",
    heading: "var(--header-primary, #f2f3f5)",
    bg: "var(--background-secondary, #2b2d31)",
    bgAlt: "var(--background-secondary-alt, #232428)",
    border: "var(--background-modifier-accent, rgba(255,255,255,.06))",
    accent: "var(--brand-500, #5865f2)",
    danger: "var(--status-danger, #da373c)",
    success: "var(--green-360, #23a55a)",
    warning: "var(--yellow-300, #f0b232)"
} as const;

export const s = {
    page: {
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        color: c.text,
        fontFamily: "var(--font-primary, sans-serif)",
        fontSize: "14px"
    },
    h1: {
        margin: 0,
        color: c.heading,
        fontSize: "20px",
        fontWeight: 600
    },
    h2: {
        margin: "8px 0 0",
        color: c.heading,
        fontSize: "16px",
        fontWeight: 600
    },
    muted: { color: c.muted, fontSize: "13px" },
    card: {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        padding: "12px 14px",
        borderRadius: "8px",
        background: c.bgAlt,
        border: `1px solid ${c.border}`
    },
    row: { display: "flex", alignItems: "center", gap: "10px" },
    spread: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" },
    grid: { display: "grid", gap: "10px", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" },
    input: {
        width: "100%",
        boxSizing: "border-box",
        padding: "8px 10px",
        borderRadius: "4px",
        border: `1px solid ${c.border}`,
        background: "var(--input-background, rgba(0,0,0,.3))",
        color: c.text,
        fontSize: "14px"
    },
    button: {
        padding: "8px 14px",
        borderRadius: "4px",
        border: "none",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: 500,
        color: "#fff",
        background: c.accent
    },
    buttonSecondary: { background: "var(--button-secondary-background, #4e5058)" },
    badge: {
        padding: "2px 6px",
        borderRadius: "4px",
        fontSize: "11px",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: ".02em"
    },
    tag: {
        padding: "1px 6px",
        borderRadius: "10px",
        background: c.border,
        color: c.muted,
        fontSize: "11px"
    },
    code: {
        margin: 0,
        padding: "10px",
        borderRadius: "4px",
        background: "rgba(0,0,0,.35)",
        fontFamily: "var(--font-code, monospace)",
        fontSize: "12px",
        overflow: "auto"
    }
} satisfies Record<string, CSSProperties>;
