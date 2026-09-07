/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { c, radius } from "./theme";

/**
 * Az sayıda seçenek için (2–5) segmentli düğme grubu — çirkin yerel `<select>`
 * yerine. Kategori çipleriyle aynı görsel dil.
 */
export function Segmented<T>({ value, options, onChange, disabled }: {
    value: T;
    options: Array<{ label: string; value: T }>;
    onChange(next: T): void;
    disabled?: boolean;
}) {
    return (
        <div
            role="radiogroup"
            style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "6px",
                opacity: disabled ? 0.5 : 1,
                pointerEvents: disabled ? "none" : "auto"
            }}
        >
            {options.map(option => {
                const active = option.value === value;

                return (
                    <button
                        key={String(option.value)}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        className={`mcord-chip${active ? " is-active" : ""}`}
                        onClick={() => onChange(option.value)}
                        style={{
                            padding: "7px 13px",
                            borderRadius: radius.pill,
                            border: "1px solid transparent",
                            cursor: "pointer",
                            fontFamily: "inherit",
                            fontSize: "12.5px",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                            color: active ? c.onAccent : c.muted,
                            background: active ? c.accent : c.surfaceRaised,
                            boxShadow: active
                                ? `0 4px 14px color-mix(in srgb, ${c.accent} 45%, transparent)`
                                : "none"
                        }}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}
