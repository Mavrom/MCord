/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

type Props = {
    kind: "ok" | "err";
    title: string;
    detail?: string;
    hash?: string;
    primaryLabel: string;
    onPrimary: () => void;
    onClose: () => void;
};

export function ResultScreen({ kind, title, detail, hash, primaryLabel, onPrimary, onClose }: Props) {
    return (
        <div className={`center ${kind}`}>
            <div className="icon">{kind === "ok" ? "✔" : "✘"}</div>
            <h1>{title}</h1>
            {detail && <p className="sub">{detail}</p>}
            {hash && <div className="hash">sha256: {hash}</div>}
            <div className="actions" style={{ justifyContent: "center", marginTop: 20 }}>
                <button onClick={onPrimary}>{primaryLabel}</button>
                <button className="secondary" onClick={onClose}>Kapat</button>
            </div>
        </div>
    );
}
