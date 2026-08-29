/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { McordCreateElement } from "../utils/jsx";
import { Logger } from "../utils/logger";
import { getReact } from "../webpack/react";

const logger = new Logger("Api:Notices", "#f4b8e4");

/**
 * Üst bildirim çubuğu ("notice bar") API'si.
 *
 * Discord'un ekranın en üstünde gösterdiği ince renkli çubuğun aynısını
 * plugin'ler için açar. Discord'un kendi notice'i yokken bizim kuyruğumuz
 * gösterilir; Discord bir notice gösterirken bizimki beklemede kalır.
 *
 * Kayıt/temizlik `PluginManager` üzerinden değil, plugin'in kendi
 * `start`/`stop`'unda `showNotice` / `removeNoticesBySource` ile yapılır.
 */

export interface NoticeButton {
    label: string;
    onClick(): void;
    /** Tıklanınca notice kapansın mı (varsayılan: `true`). */
    dismissOnClick?: boolean;
}

export interface Notice {
    /** Çubukta gösterilecek düz metin. */
    message: string;
    /** Sağ taraftaki eylem düğmeleri. */
    buttons?: NoticeButton[];
    /** Çubuk arka plan rengi (CSS değeri). Varsayılan: Discord moru. */
    color?: string;
    /** Notice'i ekleyen plugin adı — `removeNoticesBySource` için. */
    source?: string;
}

const queue: Notice[] = [];
let current: Notice | null = null;
const listeners = new Set<() => void>();

function emit(): void {
    for (const listener of [...listeners]) {
        try {
            listener();
        } catch (err) {
            logger.error("Notice dinleyicisinde hata:\n", err);
        }
    }
}

/** Render tarafı bunu okur. */
export function getCurrentNotice(): Notice | null {
    return current;
}

/**
 * Aktif notice'i kaldırır ve kuyruktaki sıradakine geçer. Kuyruk boşsa
 * çubuk kapanır.
 */
export function advanceNotice(): void {
    current = queue.shift() ?? null;
    emit();
}

/** `advanceNotice` için okunur takma ad — "kullanıcı kapattı" niyetini belirtir. */
export function dismissNotice(): void {
    advanceNotice();
}

/**
 * Kuyruğa bir notice ekler. Şu an gösterilen bir notice yoksa hemen gösterilir,
 * varsa sıraya girer.
 */
export function showNotice(notice: Notice): void {
    queue.push(notice);
    if (current == null) advanceNotice();
    else emit();
}

/**
 * Kısa imza: tek satır metin + isteğe bağlı tek düğme.
 *
 *   showTextNotice("Güncelleme hazır", "Yeniden başlat", restart)
 */
export function showTextNotice(message: string, buttonLabel?: string, onClick?: () => void): void {
    const buttons: NoticeButton[] = [];
    if (buttonLabel != null) {
        buttons.push({ label: buttonLabel, onClick: onClick ?? (() => {}) });
    }
    showNotice({ message, buttons });
}

/**
 * Bir kaynağa (plugin adına) ait tüm notice'leri kaldırır. Plugin durunca
 * `stop()` içinde çağrılmalı, aksi halde çubukta öksüz notice kalır.
 */
export function removeNoticesBySource(source: string): void {
    for (let i = queue.length - 1; i >= 0; i--) {
        if (queue[i].source === source) queue.splice(i, 1);
    }
    if (current?.source === source) advanceNotice();
}

function subscribe(callback: () => void): () => void {
    listeners.add(callback);
    return () => {
        listeners.delete(callback);
    };
}

// ── Render ───────────────────────────────────────────────────────────────────

/**
 * Bileşen tipi bir kez üretilip saklanıyor: patch her `nA` render'ında
 * `render()` çağırıyor, tip sabit kalmazsa React çubuğu her seferinde
 * söküp yeniden kurar ve abonelik kopar.
 */
let noticeBarComponent: (() => any) | null = null;

function getNoticeBarComponent(): () => any {
    if (noticeBarComponent != null) return noticeBarComponent;

    const React = getReact();

    noticeBarComponent = function McordNoticeBar() {
        const [, forceUpdate] = (React as any).useReducer((n: number) => n + 1, 0);
        (React as any).useEffect(() => subscribe(forceUpdate), []);

        const notice = current;
        if (notice == null) return null;

        const buttons = [...(notice.buttons ?? [])];

        return McordCreateElement(
            "div",
            {
                style: {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "12px",
                    minHeight: "36px",
                    padding: "6px 16px",
                    fontSize: "14px",
                    fontWeight: 500,
                    lineHeight: "18px",
                    color: "#ffffff",
                    background: notice.color ?? "#5865f2"
                }
            },
            McordCreateElement("span", { style: { textAlign: "center" } }, notice.message),
            ...buttons.map((button, index) =>
                McordCreateElement(
                    "button",
                    {
                        key: `mcord-notice-button-${index}`,
                        onClick: () => {
                            try {
                                button.onClick();
                            } catch (err) {
                                logger.error("Notice düğmesi işleyicisinde hata:\n", err);
                            }
                            if (button.dismissOnClick !== false) dismissNotice();
                        },
                        style: {
                            padding: "2px 10px",
                            fontSize: "13px",
                            fontWeight: 600,
                            color: "#ffffff",
                            background: "rgba(0, 0, 0, 0.25)",
                            border: "none",
                            borderRadius: "3px",
                            cursor: "pointer"
                        }
                    },
                    button.label
                )
            ),
            McordCreateElement(
                "button",
                {
                    "aria-label": "Kapat",
                    onClick: () => dismissNotice(),
                    style: {
                        padding: "0 4px",
                        fontSize: "16px",
                        lineHeight: "16px",
                        color: "#ffffff",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        opacity: 0.8
                    }
                },
                "×"
            )
        );
    };

    return noticeBarComponent;
}

/**
 * Patch'in çağırdığı giriş noktası. React elemanı döndürür; React henüz hazır
 * değilse veya render kurulamazsa `null` döner (çubuğun olmadığı durumla aynı).
 */
export function renderNoticeBar(): any {
    try {
        return McordCreateElement(getNoticeBarComponent());
    } catch (err) {
        logger.error("Notice çubuğu render edilemedi:\n", err);
        return null;
    }
}
