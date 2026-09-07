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
import { IconClose } from "./Icons";
import { SettingsRoot, type TabId } from "./SettingsRoot";
import { injectStyles } from "./styles";
import { c, radius, shadow, space } from "./theme";

const logger = new Logger("SettingsOverlay", "#f4b8e4");
const CONTAINER_ID = "mcord-settings-overlay";

let root: { unmount(): void } | null = null;

function Overlay({ initialTab, onClose }: { initialTab: TabId; onClose(): void }) {
    React.useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            // Açık bir plugin ayar balonu varsa Esc önce onu kapatsın.
            if (document.getElementById("mcord-plugin-popover")) return;
            event.preventDefault();
            event.stopPropagation();
            onClose();
        };
        window.addEventListener("keydown", onKey, true);
        return () => window.removeEventListener("keydown", onKey, true);
    }, [onClose]);

    return (
        <div
            className="mcord-root mcord-overlay"
            onMouseDown={onClose}
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 100000,
                // Arka planı bulanıklaştırmak "arkası kapanır" mesajını veriyor.
                background: "rgba(0, 0, 0, .55)",
                backdropFilter: "blur(3px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: space.xl
            }}
        >
            <div
                className="mcord-panel"
                role="dialog"
                aria-modal="true"
                aria-label="MCord ayarları"
                onMouseDown={event => event.stopPropagation()}
                onClick={event => event.stopPropagation()}
                style={{
                    position: "relative",
                    background: c.surface,
                    color: c.text,
                    borderRadius: radius.lg,
                    border: `1px solid ${c.border}`,
                    width: "min(1020px, 100%)",
                    height: "min(720px, 100%)",
                    display: "flex",
                    overflow: "hidden",
                    boxShadow: shadow.high
                }}
            >
                <SettingsRoot initialTab={initialTab} />

                <button
                    className="mcord-btn mcord-ghost"
                    onClick={onClose}
                    aria-label="Kapat"
                    title="Kapat (Esc)"
                    style={{
                        position: "absolute",
                        top: space.md,
                        right: space.md,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "32px",
                        height: "32px",
                        padding: 0,
                        borderRadius: radius.sm,
                        border: "none",
                        background: "transparent",
                        color: c.muted,
                        cursor: "pointer",
                        zIndex: 1
                    }}
                >
                    <IconClose size={18} />
                </button>
            </div>
        </div>
    );
}

export function openSettingsOverlay(initialTab: TabId = "plugins"): void {
    if (root != null) {
        logger.debug("zaten açık");
        return;
    }

    injectStyles();

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
