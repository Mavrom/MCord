/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { openExternal } from "../../api/net";
import {
    checkForUpdates,
    downloadRelease,
    getUpdateState,
    skipVersion,
    type UpdateState
} from "../../plugins/_core/updater/check";
import { REPO_URL } from "../../utils/constants";
import { React } from "../../webpack/react";
import { c, s } from "../theme";

export function UpdaterTab() {
    const [state, setState] = React.useState<UpdateState>(getUpdateState);
    const [checking, setChecking] = React.useState(false);
    const [downloading, setDownloading] = React.useState(false);
    const [downloadError, setDownloadError] = React.useState<string | null>(null);
    const [pending, setPending] = React.useState(() => {
        try {
            return window.McordNative.updater.getPending();
        } catch {
            return null;
        }
    });

    const download = async () => {
        if (!state.latest) return;

        setDownloading(true);
        setDownloadError(null);

        try {
            await downloadRelease(state.latest);
            setPending(window.McordNative.updater.getPending());
        } catch (err) {
            setDownloadError(String(err));
        } finally {
            setDownloading(false);
        }
    };

    const check = async () => {
        setChecking(true);
        setState(await checkForUpdates());
        setChecking(false);
    };

    return (
        <div style={s.page}>
            <h1 style={s.h1}>Güncelleme</h1>

            <div style={s.card}>
                <div style={s.spread}>
                    <div>
                        <div style={{ color: c.heading, fontWeight: 500 }}>Kurulu sürüm</div>
                        <div style={s.muted}>{state.current} ({COMMIT_HASH})</div>
                    </div>
                    <button style={s.button} disabled={checking} onClick={() => void check()}>
                        {checking ? "Kontrol ediliyor…" : "Güncellemeleri kontrol et"}
                    </button>
                </div>

                {state.checkedAt && (
                    <div style={s.muted}>
                        Son kontrol: {new Date(state.checkedAt).toLocaleString("tr-TR")}
                    </div>
                )}

                {state.error && (
                    <div style={{ ...s.muted, color: c.danger }}>Kontrol başarısız: {state.error}</div>
                )}
            </div>

            {state.latest && (
                <div style={{ ...s.card, borderLeft: `3px solid ${state.available ? c.success : c.border}` }}>
                    <div style={{ color: c.heading, fontWeight: 600 }}>
                        {state.available ? `Yeni sürüm: ${state.latest.version}` : "En güncel sürümdesin"}
                    </div>

                    {state.latest.testedBuilds && (
                        <div style={s.muted}>
                            Test edilen Discord build aralığı: {state.latest.testedBuilds}
                        </div>
                    )}

                    {state.latest.changelog && (
                        <>
                            <div style={{ ...s.muted, marginTop: "4px" }}>Değişiklikler</div>
                            <pre style={{ ...s.code, maxHeight: "320px" }}>{state.latest.changelog}</pre>
                        </>
                    )}

                    {state.available && (
                        <div style={{ ...s.row, flexWrap: "wrap" }}>
                            <button
                                style={s.button}
                                disabled={downloading}
                                onClick={() => void download()}
                            >
                                {downloading ? "İndiriliyor…" : "İndir ve doğrula"}
                            </button>
                            <button
                                style={{ ...s.button, ...s.buttonSecondary }}
                                onClick={() => void openExternal(`${REPO_URL}/releases/tag/${state.latest!.tag}`)}
                            >
                                Sürüm sayfasını aç
                            </button>
                            <button
                                style={{ ...s.button, ...s.buttonSecondary }}
                                onClick={() => {
                                    skipVersion(state.latest!.version);
                                    setState({ ...state, available: false });
                                }}
                            >
                                Bu sürümü atla
                            </button>
                        </div>
                    )}
                </div>
            )}

            {downloadError && (
                <div style={{ ...s.card, borderLeft: `3px solid ${c.danger}` }}>
                    <div style={{ color: c.heading, fontWeight: 500 }}>İndirme başarısız</div>
                    <div style={{ ...s.muted, color: c.danger }}>{downloadError}</div>
                </div>
            )}

            {pending && (
                <div style={{ ...s.card, borderLeft: `3px solid ${c.success}` }}>
                    <div style={{ color: c.heading, fontWeight: 500 }}>
                        {pending.version} indirildi ve doğrulandı
                    </div>
                    <div style={s.muted}>
                        Discord'u kapattığında uygulanacak. SHA-256: <code>{pending.sha256.slice(0, 16)}…</code>
                    </div>
                    <div style={{ ...s.row, flexWrap: "wrap" }}>
                        <button
                            style={s.button}
                            onClick={() => void window.McordNative.app.relaunch()}
                        >
                            Şimdi yeniden başlat
                        </button>
                        <button
                            style={{ ...s.button, ...s.buttonSecondary }}
                            onClick={() => {
                                void window.McordNative.updater.discard();
                                setPending(null);
                            }}
                        >
                            İptal et
                        </button>
                    </div>
                </div>
            )}

            <div style={s.muted}>
                Güncellemeler sessizce yapılmaz — ne değiştiğini görüp onayladıktan sonra
                uygulanır. İndirilen paket SHA-256 ile doğrulanır.
            </div>
        </div>
    );
}
