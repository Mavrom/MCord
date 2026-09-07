/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import type { Plugin } from "../utils/types";
import { React, ReactDOM } from "../webpack/react";
import { IconClose } from "./Icons";
import { howItWorks } from "./pluginInfo";
import { SettingsPanel } from "./SettingControls";
import { c, radius, s, shadow, space } from "./theme";
import { Toggle } from "./Toggle";
import { usePluginToggle } from "./usePluginToggle";

const POPOVER_ID = "mcord-plugin-popover";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <div
                style={{
                    color: c.faint,
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: ".06em",
                    textTransform: "uppercase"
                }}
            >
                {title}
            </div>
            <div style={{ color: c.text, fontSize: "13.5px", lineHeight: 1.55 }}>{children}</div>
        </div>
    );
}

/**
 * Plugin ayrıntısı — ne işe yaradığı, nasıl çalıştığı ve ayarları. Plugin
 * listesini yerinde bırakıp üstünde balon pencere olarak açılır.
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
    // `position: fixed`'i viewport yerine kendine göre konumlandırıyordu.
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
                background: "rgba(0, 0, 0, .4)",
                padding: space.xl
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={`${plugin.name} bilgi ve ayarları`}
                onMouseDown={event => event.stopPropagation()}
                onClick={event => event.stopPropagation()}
                style={{
                    display: "flex",
                    flexDirection: "column",
                    width: "min(600px, 100%)",
                    maxHeight: "min(720px, 88vh)",
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
                        alignItems: "center",
                        gap: space.sm,
                        padding: `${space.md} ${space.lg}`,
                        borderBottom: `1px solid ${c.border}`
                    }}
                >
                    <span
                        style={{
                            flex: "0 0 auto",
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            background: enabled ? c.success : `color-mix(in srgb, ${c.danger} 60%, transparent)`
                        }}
                    />
                    <div style={{ flex: 1, minWidth: 0, color: c.heading, fontWeight: 700, fontSize: "16px" }}>
                        {plugin.name}
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

                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: space.lg,
                        padding: space.lg,
                        overflowY: "auto",
                        minHeight: 0
                    }}
                >
                    <Section title="Ne işe yarar">{plugin.description}</Section>
                    <Section title="Nasıl çalışır">{howItWorks(plugin)}</Section>

                    {(plugin.tags?.length ?? 0) > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                            {plugin.tags!.map(tag => (
                                <span key={tag} style={s.tag}>#{tag}</span>
                            ))}
                        </div>
                    )}

                    {plugin.settings != null && (
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: space.sm,
                                paddingTop: space.md,
                                borderTop: `1px solid ${c.border}`
                            }}
                        >
                            <div
                                style={{
                                    color: c.faint,
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    letterSpacing: ".06em",
                                    textTransform: "uppercase"
                                }}
                            >
                                Ayarlar
                            </div>
                            <SettingsPanel settings={plugin.settings} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return ReactDOM.createPortal(node, document.body);
}
