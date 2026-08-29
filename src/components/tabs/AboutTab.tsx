/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { openExternal } from "../../api/net";
import { REPO_URL } from "../../utils/constants";
import { getBuildNumber } from "../../webpack/codePatcher";
import { React } from "../../webpack/react";
import { c, s } from "../theme";

export function AboutTab() {
    const version = React.useMemo(() => {
        try {
            return window.McordNative.app.getVersionInfo();
        } catch {
            return null;
        }
    }, []);

    const injection = React.useMemo(() => {
        try {
            return window.McordNative.injection.getState();
        } catch {
            return null;
        }
    }, []);

    const rows: Array<[string, string]> = [
        ["MCord sürümü", VERSION],
        ["Build", `${COMMIT_HASH} — ${new Date(BUILD_TIMESTAMP).toLocaleString("tr-TR")}`],
        ["Discord build", String(getBuildNumber())],
        ["Electron", version?.electronVersion ?? "?"],
        ["Chrome", version?.chromeVersion ?? "?"],
        ["Discord klasörü", injection ? `${injection.currentVersion}` : "?"]
    ];

    return (
        <div style={s.page}>
            <h1 style={s.h1}>Hakkında</h1>

            <div style={s.card}>
                {rows.map(([label, value]) => (
                    <div key={label} style={s.spread}>
                        <span style={s.muted}>{label}</span>
                        <span style={{ fontFamily: "var(--font-code, monospace)", fontSize: "12px" }}>
                            {value}
                        </span>
                    </div>
                ))}
            </div>

            {injection?.isOutdated && (
                <div style={{ ...s.card, borderLeft: `3px solid ${c.warning}` }}>
                    <div style={{ color: c.heading, fontWeight: 500 }}>
                        Discord güncellendi, enjeksiyon eski sürümde
                    </div>
                    <div style={s.muted}>
                        Çalışılan sürüm <code>{injection.currentVersion}</code>, diskteki en yeni{" "}
                        <code>{injection.latestVersion}</code>.
                    </div>
                    {injection.canRepatch && (
                        <button
                            style={{ ...s.button, alignSelf: "flex-start" }}
                            onClick={() => void window.McordNative.injection.repatchLatest()}
                        >
                            Yeni sürüme kopyala
                        </button>
                    )}
                </div>
            )}

            <h2 style={s.h2}>Lisans</h2>
            <div style={s.card}>
                <div style={s.muted}>
                    MCord, PolyForm Strict License 1.0.0 ile lisanslıdır; tüm hakları
                    Mavrom'a aittir. Kaynak kodu görünürdür ama kopyalanamaz, değiştirilemez
                    veya dağıtılamaz. Telemetri, analitik ve uzak sunucuya giden hiçbir
                    kullanıcı verisi yoktur.
                </div>
                <button
                    style={{ ...s.button, ...s.buttonSecondary, alignSelf: "flex-start" }}
                    onClick={() => void openExternal(REPO_URL)}
                >
                    Kaynak kodu
                </button>
            </div>

            <div style={{ ...s.card, borderLeft: `3px solid ${c.danger}` }}>
                <div style={{ color: c.heading, fontWeight: 500 }}>Uyarı</div>
                <div style={s.muted}>
                    MCord bir istemci modudur ve Discord'un Kullanım Şartları'na aykırıdır.
                    Hesap askıya alma pratikte nadirdir ama olasılığı sıfır değildir.
                </div>
            </div>
        </div>
    );
}
