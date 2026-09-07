/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/**
 * MCord arayüzünün gerçek CSS katmanı.
 *
 * Inline style ile yapılamayanlar burada: `:focus-visible` halkaları,
 * `::placeholder`, kaydırma çubuğu, `@keyframes`, hover/active durumları ve
 * `prefers-reduced-motion`. Hepsi `.mcord-root` altında kapsanıyor — Discord'un
 * kendi stillerine sızmıyor.
 */

const STYLE_ID = "mcord-ui-styles";

const CSS = `
.mcord-root {
    --mc-ease: cubic-bezier(.2, .7, .3, 1);
    --mc-fast: 140ms;
    --mc-slow: 220ms;
    color-scheme: inherit;
}

.mcord-root *,
.mcord-root *::before,
.mcord-root *::after { box-sizing: border-box; }

/* ── Odak halkaları ─────────────────────────────────────────────────────── */
.mcord-root :focus { outline: none; }
.mcord-root :focus-visible {
    outline: 2px solid var(--brand-500, #5865f2);
    outline-offset: 2px;
    border-radius: 6px;
}

/* ── Girdi ──────────────────────────────────────────────────────────────── */
.mcord-root input::placeholder { color: var(--text-muted, #949ba4); opacity: .75; }
.mcord-root input[type="search"]::-webkit-search-cancel-button { display: none; }

/* ── Kaydırma çubuğu — Discord'unkiyle aynı dil ─────────────────────────── */
.mcord-root ::-webkit-scrollbar { width: 8px; height: 8px; }
.mcord-root ::-webkit-scrollbar-track { background: transparent; }
.mcord-root ::-webkit-scrollbar-thumb {
    background: var(--scrollbar-thin-thumb, rgba(255, 255, 255, .12));
    border-radius: 999px;
}
.mcord-root ::-webkit-scrollbar-thumb:hover {
    background: var(--scrollbar-auto-thumb, rgba(255, 255, 255, .22));
}

/* ── Kart ───────────────────────────────────────────────────────────────── */
.mcord-card {
    transition: border-color var(--mc-fast) var(--mc-ease),
                box-shadow var(--mc-fast) var(--mc-ease),
                transform var(--mc-fast) var(--mc-ease);
}
.mcord-card:hover {
    border-color: var(--border-normal, rgba(255, 255, 255, .16));
    box-shadow: 0 6px 20px rgba(0, 0, 0, .28);
    transform: translateY(-1px);
}

/* ── Kenar çubuğu ───────────────────────────────────────────────────────── */
.mcord-nav-item {
    position: relative;
    transition: background var(--mc-fast) var(--mc-ease), color var(--mc-fast) var(--mc-ease);
}
.mcord-nav-item:hover { background: var(--background-modifier-hover, rgba(255, 255, 255, .04)); }
.mcord-nav-item[aria-current="true"]::before {
    content: "";
    position: absolute;
    left: -8px;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 18px;
    border-radius: 999px;
    background: var(--brand-500, #5865f2);
}

/* ── Düğmeler ───────────────────────────────────────────────────────────── */
.mcord-btn { transition: background var(--mc-fast) var(--mc-ease), color var(--mc-fast) var(--mc-ease), border-color var(--mc-fast) var(--mc-ease); }
.mcord-btn:not(:disabled):hover { filter: brightness(1.08); }
.mcord-btn:not(:disabled):active { transform: scale(.97); }
.mcord-btn:disabled { opacity: .45; cursor: not-allowed; }

.mcord-ghost:hover { background: var(--background-modifier-hover, rgba(255, 255, 255, .05)) !important; }

/* ── Kategori çipleri ───────────────────────────────────────────────────── */
.mcord-chip { transition: background var(--mc-fast) var(--mc-ease), color var(--mc-fast) var(--mc-ease), transform var(--mc-fast) var(--mc-ease); }
.mcord-chip:not(.is-active):hover {
    filter: none;
    color: var(--header-primary, #f2f3f5) !important;
    background: var(--background-modifier-selected, rgba(255, 255, 255, .09)) !important;
}
.mcord-chip:active { transform: scale(.96); }

/* ── Etiket çipleri (kart içi) ──────────────────────────────────────────── */
.mcord-tag:hover {
    filter: none;
    color: var(--text-default, #dbdee1) !important;
    background: var(--background-modifier-selected, rgba(255, 255, 255, .1)) !important;
}

/* Kart dişlisi — hover'da belirginleşir */
.mcord-card-gear:hover { color: var(--header-primary, #f2f3f5) !important; background: var(--background-modifier-hover, rgba(255, 255, 255, .06)) !important; }
.mcord-card:hover .mcord-card-gear { color: var(--text-muted, #949ba4); }

/* Ayarı olan kartın adına hover ipucu */
.mcord-card-name { transition: color var(--mc-fast) var(--mc-ease); }
.mcord-card [role="button"]:hover .mcord-card-name { color: var(--brand-500, #5865f2); }

/* ── A–Z atlama şeridi ──────────────────────────────────────────────────── */
.mcord-alpha { transition: color var(--mc-fast) var(--mc-ease), background var(--mc-fast) var(--mc-ease); }
.mcord-alpha:not(:disabled):hover {
    filter: none;
    color: var(--header-primary, #f2f3f5) !important;
    background: var(--background-modifier-selected, rgba(255, 255, 255, .1)) !important;
}
.mcord-alpha:disabled { cursor: default; }

/* ── Giriş animasyonları ────────────────────────────────────────────────── */
@keyframes mcord-overlay-in { from { opacity: 0 } to { opacity: 1 } }
@keyframes mcord-panel-in {
    from { opacity: 0; transform: translateY(8px) scale(.985) }
    to   { opacity: 1; transform: none }
}
@keyframes mcord-fade-up {
    from { opacity: 0; transform: translateY(6px) }
    to   { opacity: 1; transform: none }
}

.mcord-overlay { animation: mcord-overlay-in 160ms var(--mc-ease) both; }
.mcord-panel { animation: mcord-panel-in var(--mc-slow) var(--mc-ease) both; }
.mcord-enter { animation: mcord-fade-up 200ms var(--mc-ease) both; }

/* Hareket hassasiyeti — kullanıcı azaltılmış hareket istiyorsa hepsini kes. */
@media (prefers-reduced-motion: reduce) {
    .mcord-root *,
    .mcord-overlay,
    .mcord-panel,
    .mcord-enter {
        animation: none !important;
        transition: none !important;
    }
    .mcord-card:hover { transform: none; }
}
`;

export function injectStyles(): void {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
}

export function removeStyles(): void {
    document.getElementById(STYLE_ID)?.remove();
}
