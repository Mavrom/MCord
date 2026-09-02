/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { useEffect, useState } from "react";

import { type BranchStatus, core, onProgress, type Result } from "./api";
import { ActionBar } from "./components/ActionBar";
import { BranchList } from "./components/BranchList";
import { ProgressLog } from "./components/ProgressLog";
import { ResultScreen } from "./components/ResultScreen";
import { errorText } from "./messages.mjs";

type Action = "install" | "repair" | "uninstall";

type Screen =
    | { name: "loading" }
    | { name: "no-discord" }
    | { name: "pick"; branches: BranchStatus[]; selected: string | null }
    | { name: "working"; lines: string[] }
    | { name: "done"; branchId: string; size: number; sha256: string; title: string }
    | { name: "error"; code: string; retry: (() => void) | null };

export function App() {
    const [screen, setScreen] = useState<Screen>({ name: "loading" });

    async function refresh() {
        setScreen({ name: "loading" });
        const res = await core.detectInstalls();
        if (!res.ok) {
            setScreen(res.code === "NO_DISCORD"
                ? { name: "no-discord" }
                : { name: "error", code: res.code, retry: refresh });
            return;
        }
        setScreen({ name: "pick", branches: res.data, selected: res.data[0]?.id ?? null });
    }

    useEffect(() => { void refresh(); }, []);

    async function run(branchId: string, action: Action, title: string) {
        const lines: string[] = [];
        const emit = (line: string) => {
            lines.push(`· ${line}`);
            setScreen({ name: "working", lines: [...lines] });
        };
        onProgress(emit);
        setScreen({ name: "working", lines });

        const call = (): Promise<Result<{ size?: number; sha256?: string; restored?: boolean }>> =>
            action === "install" ? core.install(branchId)
                : action === "repair" ? core.repair(branchId)
                    : core.uninstall(branchId);

        let res = await call();

        if (!res.ok && res.code === "DISCORD_RUNNING") {
            emit("Discord kapatılıyor…");
            const closed = await core.closeDiscord(branchId);
            if (!closed.ok) {
                setScreen({ name: "error", code: closed.code, retry: () => void run(branchId, action, title) });
                return;
            }
            res = await call();
        }

        if (!res.ok) {
            setScreen({ name: "error", code: res.code, retry: () => void run(branchId, action, title) });
            return;
        }

        if (action === "uninstall") {
            await refresh();
            return;
        }
        setScreen({ name: "done", branchId, size: res.data.size ?? 0, sha256: res.data.sha256 ?? "", title });
    }

    switch (screen.name) {
        case "loading":
            return <div className="center"><p className="sub">Discord kurulumları taranıyor…</p></div>;

        case "no-discord":
            return (
                <div className="center err">
                    <div className="icon">✘</div>
                    <h1>Discord bulunamadı</h1>
                    <p className="sub">{errorText("NO_DISCORD")}</p>
                    <div className="actions" style={{ justifyContent: "center", marginTop: 20 }}>
                        <button onClick={refresh}>Tekrar tara</button>
                    </div>
                </div>
            );

        case "pick": {
            const sel = screen.branches.find(b => b.id === screen.selected);
            return (
                <div>
                    <h1>MCord Kurulum</h1>
                    <p className="sub">
                        MCord bir istemci modudur ve Discord'un Kullanım Şartları'na aykırıdır.
                    </p>
                    <BranchList
                        branches={screen.branches}
                        selected={screen.selected}
                        onSelect={id => setScreen({ ...screen, selected: id })}
                    />
                    {sel && (
                        <ActionBar
                            disabled={!screen.selected}
                            installed={sel.installed}
                            onInstall={() => void run(sel.id, "install", "Kuruldu")}
                            onRepair={() => void run(sel.id, "repair", "Onarıldı")}
                            onUninstall={() => void run(sel.id, "uninstall", "Kaldırıldı")}
                        />
                    )}
                </div>
            );
        }

        case "working":
            return (
                <div>
                    <h1>İşlem sürüyor…</h1>
                    <p className="sub">Bu pencereyi kapatma.</p>
                    <ProgressLog lines={screen.lines} />
                </div>
            );

        case "done":
            return (
                <ResultScreen
                    kind="ok"
                    title={screen.title}
                    detail={`${(screen.size / 1024).toFixed(1)} KB`}
                    hash={screen.sha256}
                    primaryLabel="Discord'u başlat"
                    onPrimary={() => void core.launchDiscord(screen.branchId)}
                    onClose={refresh}
                />
            );

        case "error":
            return (
                <ResultScreen
                    kind="err"
                    title="Hata"
                    detail={errorText(screen.code)}
                    primaryLabel={screen.retry ? "Tekrar dene" : "Tekrar tara"}
                    onPrimary={screen.retry ?? refresh}
                    onClose={refresh}
                />
            );
    }
}
