/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/** Discord'unkine benzeyen anahtar — çıplak `<input type="checkbox">` yerine. */

import { React } from "../webpack/react";
import { c, motion, radius } from "./theme";

export function Toggle({ checked, disabled, onChange, label }: {
    checked: boolean;
    disabled?: boolean;
    onChange(next: boolean): void;
    label: string;
}) {
    const [hover, setHover] = React.useState(false);

    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={() => !disabled && onChange(!checked)}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                position: "relative",
                flex: "0 0 auto",
                width: "38px",
                height: "22px",
                padding: 0,
                borderRadius: radius.pill,
                border: "none",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? .45 : 1,
                background: checked ? c.success : "var(--primary-400, #80848e)",
                boxShadow: hover && !disabled ? `0 0 0 3px color-mix(in srgb, ${c.accent} 22%, transparent)` : "none",
                transition: `background ${motion}, box-shadow ${motion}`
            }}
        >
            <span
                style={{
                    position: "absolute",
                    top: "3px",
                    left: checked ? "19px" : "3px",
                    width: "16px",
                    height: "16px",
                    borderRadius: "50%",
                    background: "#fff",
                    boxShadow: "0 1px 2px rgba(0,0,0,.28)",
                    transition: `left ${motion}`
                }}
            />
        </button>
    );
}
