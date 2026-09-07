/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import type { ReactNode } from "react";

import { React, ReactDOM } from "../webpack/react";
import { radius } from "./theme";

/**
 * Hafif ipucu balonu. Discord'un webpack `Tooltip`'ine bağımlı değil.
 *
 * Balon `document.body`'ye portal ediliyor ve `position: fixed` ile hedefin
 * üstüne konumlanıyor — çünkü sunucu mesaj başlıklarında `overflow: hidden`
 * saf-CSS `::after` balonunu kırpıyordu (DM'lerde sorun yoktu).
 */
export function Tooltip({ text, children }: { text: string; children: ReactNode }) {
    const ref = React.useRef<HTMLSpanElement>(null);
    const [pos, setPos] = React.useState<{ x: number; y: number } | null>(null);

    const show = () => {
        const rect = ref.current?.getBoundingClientRect();
        if (rect) setPos({ x: rect.left + rect.width / 2, y: rect.top });
    };
    const hide = () => setPos(null);

    return (
        <span
            ref={ref}
            onMouseEnter={show}
            onMouseLeave={hide}
            style={{ display: "inline-flex" }}
        >
            {children}
            {pos != null && ReactDOM.createPortal(
                <div
                    style={{
                        position: "fixed",
                        left: `${pos.x}px`,
                        top: `${pos.y - 9}px`,
                        transform: "translate(-50%, -100%)",
                        padding: "5px 9px",
                        borderRadius: radius.sm,
                        background: "var(--background-floating, #111214)",
                        color: "var(--text-default, #dbdee1)",
                        fontFamily: "var(--font-primary, 'gg sans', 'Segoe UI', system-ui, sans-serif)",
                        fontSize: "12px",
                        fontWeight: 500,
                        lineHeight: 1.3,
                        whiteSpace: "nowrap",
                        boxShadow: "0 4px 14px rgba(0, 0, 0, .4)",
                        pointerEvents: "none",
                        zIndex: 100002
                    }}
                >
                    {text}
                    <span
                        style={{
                            position: "absolute",
                            left: "50%",
                            top: "100%",
                            transform: "translateX(-50%)",
                            border: "5px solid transparent",
                            borderTopColor: "var(--background-floating, #111214)"
                        }}
                    />
                </div>,
                document.body
            )}
        </span>
    );
}
