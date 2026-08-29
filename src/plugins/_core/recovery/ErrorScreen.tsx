/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { openExternal } from "../../../api/net";
import { ISSUES_URL, REPO_URL } from "../../../utils/constants";
import { React } from "../../../webpack/react";
import type { Attribution } from "./attribution";
import { parseGithubUrl } from "./attribution";

/** Detay panelinin yüksekliği (plan §8.4). */
function detailsHeight(): number {
    return Math.min(0.6 * window.innerHeight, 534);
}

export interface ErrorScreenProps {
    error: Error | null;
    componentStack: string;
    attribution: Attribution;
    onRecover(): void;
    onSafeMode(): void;
}

const styles = {
    panel: {
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        padding: "16px",
        margin: "16px auto",
        maxWidth: "760px",
        borderRadius: "8px",
        background: "rgba(0,0,0,.35)",
        color: "#dbdee1",
        fontFamily: "var(--font-primary, sans-serif)",
        fontSize: "14px"
    },
    row: { display: "flex", gap: "8px", flexWrap: "wrap" },
    button: {
        padding: "8px 16px",
        borderRadius: "4px",
        border: "none",
        cursor: "pointer",
        fontWeight: 500,
        color: "#fff",
        background: "#5865f2"
    },
    secondary: { background: "#4e5058" },
    danger: { background: "#da373c" },
    code: {
        margin: 0,
        padding: "12px",
        borderRadius: "4px",
        background: "rgba(0,0,0,.45)",
        overflow: "auto",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        fontFamily: "var(--font-code, monospace)",
        fontSize: "12px"
    },
    culprit: {
        padding: "8px 12px",
        borderRadius: "4px",
        background: "rgba(240,120,120,.15)",
        borderLeft: "3px solid #e78284"
    }
} as const;

export function ErrorScreen(props: ErrorScreenProps) {
    const { error, componentStack, attribution, onRecover, onSafeMode } = props;

    const [expanded, setExpanded] = React.useState(false);
    const [maxHeight, setMaxHeight] = React.useState(detailsHeight);

    // Pencere yeniden boyutlandığında panel yüksekliği güncelleniyor (plan §8.4).
    React.useEffect(() => {
        const onResize = () => setMaxHeight(detailsHeight());
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    const stack = `${error?.stack ?? String(error)}\n\nComponent stack:${componentStack}`;

    return (
        <div style={styles.panel}>
            <strong>MCord bir render hatası yakaladı.</strong>

            {attribution.plugins.length > 0 && (
                <div style={styles.culprit}>
                    Muhtemel sorumlu: <strong>{attribution.plugins.join(", ")}</strong>
                    {" "}({attribution.source === "function-patch" ? "fonksiyon patch'i" : "kod patch'i"})
                </div>
            )}

            <div style={styles.row}>
                <button style={styles.button} onClick={onRecover}>Kurtarmayı Dene</button>
                <button
                    style={{ ...styles.button, ...styles.secondary }}
                    onClick={() => setExpanded(value => !value)}
                >
                    {expanded ? "Detayları Gizle" : "Hata Detayları"}
                </button>
                <button
                    style={{ ...styles.button, ...styles.secondary }}
                    onClick={() => void openExternal(buildIssueUrl(error, attribution))}
                >
                    GitHub'da Bildir
                </button>
                <button style={{ ...styles.button, ...styles.danger }} onClick={onSafeMode}>
                    Güvenli Mod
                </button>
            </div>

            {expanded && (
                <pre style={{ ...styles.code, maxHeight: `${maxHeight}px` }}>{stack}</pre>
            )}
        </div>
    );
}

/** Ön doldurulmuş GitHub issue'su (plan §8.4). */
export function buildIssueUrl(error: Error | null, attribution: Attribution): string {
    const base = `${parseGithubUrl(ISSUES_URL)}`;

    const name = attribution.plugins[0] ?? "Bilinmiyor";
    const title = `[Bug Report] Plugin Crash - ${name} v${VERSION}`;

    const body = [
        "### Error Details",
        "```js",
        (error?.stack ?? String(error)).slice(0, 4000),
        "```",
        "",
        "### Steps to Reproduce",
        "1. ",
        "2. ",
        "3. ",
        "",
        "### Additional Context",
        `- MCord: \`${VERSION}\` (\`${COMMIT_HASH}\`)`,
        `- Atıf kaynağı: ${attribution.source}`,
        `- Depo: ${parseGithubUrl(REPO_URL)}`
    ].join("\n");

    return `${base}?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
}
