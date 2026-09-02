/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/**
 * MCord ayarlarını **kendi React kökümüzde** açar — Discord'un modal sistemine
 * hiç dokunmadan. Böylece Discord sürüm/webpack değişikliklerinden etkilenmez
 * (Canary'de `openModal` içeriği tıkta kapanıyordu).
 */

import { Logger } from "../utils/logger";
import { getReactDOMClient, React } from "../webpack/react";
import { SettingsRoot, type TabId } from "./SettingsRoot";

const logger = new Logger("SettingsOverlay", "#f4b8e4");
const CONTAINER_ID = "mcord-settings-overlay";

let root: { unmount(): void } | null = null;

function Overlay({ initialTab, onClose }: { initialTab: TabId; onClose(): void }) {
    React.useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                onClose();
            }
        };
        window.addEventListener("keydown", onKey, true);
        return () => window.removeEventListener("keydown", onKey, true);
    }, [onClose]);

    return (
        <div
            onMouseDown={onClose}
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 100000,
                background: "rgba(0, 0, 0, .6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
            }}
        >
            <div
                onMouseDown={event => event.stopPropagation()}
                onClick={event => event.stopPropagation()}
                style={{
                    background: "var(--background-primary, #313338)",
                    color: "var(--text-normal, #dbdee1)",
                    borderRadius: "8px",
                    width: "min(1000px, 92vw)",
                    height: "min(760px, 88vh)",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    boxShadow: "0 16px 48px rgba(0, 0, 0, .4)"
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 16px",
                        borderBottom: "1px solid var(--background-modifier-accent, #3f4147)",
                        flex: "0 0 auto"
                    }}
                >
                    <strong style={{ fontSize: "15px" }}>MCord</strong>
                    <button
                        onClick={onClose}
                        aria-label="Kapat"
                        style={{
                            background: "none",
                            border: 0,
                            color: "inherit",
                            fontSize: "20px",
                            lineHeight: 1,
                            cursor: "pointer",
                            padding: "0 4px"
                        }}
                    >
                        ×
                    </button>
                </div>

                {/* Kaydırmayı SettingsRoot kendi içinde yönetiyor (kenar çubuğu sabit kalsın). */}
                <div style={{ flex: 1, minHeight: 0, minWidth: 0, display: "flex" }}>
                    <SettingsRoot initialTab={initialTab} />
                </div>
            </div>
        </div>
    );
}

export function openSettingsOverlay(initialTab: TabId = "plugins"): void {
    if (root != null) {
        logger.debug("zaten açık");
        return;
    }

    let container = document.getElementById(CONTAINER_ID);
    if (!container) {
        container = document.createElement("div");
        container.id = CONTAINER_ID;
        document.body.appendChild(container);
    }

    const close = () => {
        try {
            root?.unmount();
        } catch (err) {
            logger.warn("unmount hatası:", err);
        }
        container?.remove();
        root = null;
    };

    try {
        const created = getReactDOMClient().createRoot(container);
        created.render(<Overlay initialTab={initialTab} onClose={close} />);
        root = { unmount: () => created.unmount() };
        logger.info("açıldı");
    } catch (err) {
        logger.error("açılamadı:", err);
        container.remove();
        root = null;
    }
}

export function closeSettingsOverlay(): void {
    if (root == null) return;
    try {
        root.unmount();
    } catch { /* zaten gitmiş */ }
    document.getElementById(CONTAINER_ID)?.remove();
    root = null;
}

export function isSettingsOverlayOpen(): boolean {
    return root != null;
}
