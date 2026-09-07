/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import type { Plugin } from "../utils/types";
import { React, ReactDOM } from "../webpack/react";
import { IconClose } from "./Icons";
import { SettingsPanel } from "./SettingControls";
import { c, radius, s, shadow, space } from "./theme";
import { Toggle } from "./Toggle";
import { usePluginToggle } from "./usePluginToggle";

const POPOVER_ID = "mcord-plugin-popover";

/**
 * Plugin ayarları — plugin listesini yerinde bırakıp üstünde küçük bir balon
 * pencere olarak açılır (Discord'un profil popout'u gibi). Sekme değiştirmez.
 */
export function PluginSettingsPopover({ plugin, onClose, onChanged }: {
    plugin: Plugin;
    onClose(): void;
    onChanged(): void;
}) {
    const { enabled, toggle } = usePluginToggle(plugin, onChanged);

    React.useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            event.stopPropagation();
            onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    // `document.body`'ye portal: MCord overlay'inde `backdrop-filter` var, o da
    // `position: fixed`'i viewport yerine kendine göre konumlandırıyordu —
    // popout listenin en üstüne yapışıyordu. Body'ye taşıyınca gerçekten
    // ekranın ortasında açılıyor.
    const node = (
        <div
            id={POPOVER_ID}
            className="mcord-root mcord-enter"
            onMouseDown={onClose}
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 100001,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0, 0, 0, .35)",
                padding: space.xl
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={`${plugin.name} ayarları`}
                onMouseDown={event => event.stopPropagation()}
                onClick={event => event.stopPropagation()}
                style={{
                    display: "flex",
                    flexDirection: "column",
                    width: "min(460px, 100%)",
                    maxHeight: "min(560px, 82vh)",
                    background: c.surface,
                    border: `1px solid ${c.border}`,
                    borderRadius: radius.lg,
                    boxShadow: shadow.high,
                    overflow: "hidden"
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: space.sm,
                        padding: `${space.md} ${space.md} ${space.sm}`,
                        borderBottom: `1px solid ${c.border}`
                    }}
                >
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: c.heading, fontWeight: 700, fontSize: "15px" }}>
                            {plugin.name}
                        </div>
                    </div>

                    <Toggle
                        checked={enabled}
                        onChange={next => void toggle(next)}
                        label={`${plugin.name} aç/kapa`}
                    />

                    <button
                        className="mcord-btn mcord-ghost"
                        onClick={onClose}
                        aria-label="Kapat"
                        title="Kapat (Esc)"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "28px",
                            height: "28px",
                            flex: "0 0 auto",
                            padding: 0,
                            borderRadius: radius.sm,
                            border: "none",
                            background: "transparent",
                            color: c.muted,
                            cursor: "pointer"
                        }}
                    >
                        <IconClose size={16} />
                    </button>
                </div>

                <div style={{ padding: space.md, overflowY: "auto", minHeight: 0 }}>
                    <p style={{ ...s.muted, marginTop: 0, marginBottom: space.md }}>
                        {plugin.description}
                    </p>

                    {plugin.settings != null
                        ? <SettingsPanel settings={plugin.settings} />
                        : <div style={s.muted}>Bu plugin'in ayarlanabilir seçeneği yok.</div>}
                </div>
            </div>
        </div>
    );

    return ReactDOM.createPortal(node, document.body);
}
