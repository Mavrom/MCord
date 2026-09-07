/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/**
 * Tek ikon ailesi (Lucide çizim dili): 24×24 kutu, 1.5px stroke, yuvarlak uç.
 *
 * Emoji/unicode glif **kullanılmıyor** — font'a bağımlı, platformdan platforma
 * değişiyor, tema token'larıyla renklendirilemiyor ve arayüzü ucuz gösteriyor.
 */

import type { CSSProperties, ReactNode } from "react";

type IconProps = {
    size?: number;
    /** Varsayılan `currentColor` — renk üst öğeden miras alınır. */
    color?: string;
    strokeWidth?: number;
    style?: CSSProperties;
};

function Svg({ size = 20, color = "currentColor", strokeWidth = 1.5, style, children }: IconProps & {
    children: ReactNode;
}) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
            style={{ flex: "0 0 auto", display: "block", ...style }}
        >
            {children}
        </svg>
    );
}

export const IconPuzzle = (p: IconProps) => (
    <Svg {...p}>
        <path d="M15.5 3.5a2 2 0 0 1 2 2V8h1.5a2.5 2.5 0 0 1 0 5H17.5v2.5a2 2 0 0 1-2 2H13v-1.5a2.5 2.5 0 0 0-5 0V19H5.5a2 2 0 0 1-2-2v-2.5H5a2.5 2.5 0 0 0 0-5H3.5V7a2 2 0 0 1 2-2H8V6.5a2.5 2.5 0 0 0 5 0V5" />
    </Svg>
);

export const IconSliders = (p: IconProps) => (
    <Svg {...p}>
        <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" />
        <circle cx="16" cy="6" r="2" />
        <circle cx="10" cy="12" r="2" />
        <circle cx="18" cy="18" r="2" />
    </Svg>
);

export const IconDownload = (p: IconProps) => (
    <Svg {...p}>
        <path d="M12 3v12M7.5 10.5 12 15l4.5-4.5" />
        <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </Svg>
);

export const IconInfo = (p: IconProps) => (
    <Svg {...p}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 8h.01" />
    </Svg>
);

export const IconSearch = (p: IconProps) => (
    <Svg {...p}>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4 4" />
    </Svg>
);

export const IconChevronDown = (p: IconProps) => (
    <Svg {...p}>
        <path d="m6 9 6 6 6-6" />
    </Svg>
);

export const IconClose = (p: IconProps) => (
    <Svg {...p}>
        <path d="M6 6 18 18M18 6 6 18" />
    </Svg>
);

export const IconRestart = (p: IconProps) => (
    <Svg {...p}>
        <path d="M3.5 12a8.5 8.5 0 1 0 2.5-6" />
        <path d="M4 4v4h4" />
    </Svg>
);

export const IconAlert = (p: IconProps) => (
    <Svg {...p}>
        <path d="M10.3 4.3 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9.5v4M12 17h.01" />
    </Svg>
);

export const IconSearchOff = (p: IconProps) => (
    <Svg {...p}>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4 4M8.8 11h4.4" />
    </Svg>
);

/** MCord işareti — kenar çubuğu başlığındaki marka rozeti. */
export function LogoMark({ size = 24 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false"
            style={{ flex: "0 0 auto", display: "block" }}>
            <defs>
                <linearGradient id="mcord-mark" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="var(--brand-360, #7d87f5)" />
                    <stop offset="100%" stopColor="var(--brand-560, #4752c4)" />
                </linearGradient>
            </defs>
            <rect x="1.5" y="1.5" width="21" height="21" rx="6.5" fill="url(#mcord-mark)" />
            <path
                d="M7 16.5v-9l5 5.5 5-5.5v9"
                fill="none"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
