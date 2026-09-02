/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import {
    isPluginEnabled,
    pluginRequiresRestart,
    setPluginEnabled,
    startPlugin,
    stopPlugin
} from "../api/PluginManager";
import type { Plugin } from "../utils/types";
import { React } from "../webpack/react";
import { SettingsPanel } from "./SettingControls";
import { c, motion, radius, s, shadow, space, tint } from "./theme";
import { Toggle } from "./Toggle";

export function PluginCard({ plugin, onRestartNeeded }: {
    plugin: Plugin;
    onRestartNeeded(): void;
}) {
    const [enabled, setEnabled] = React.useState(() => isPluginEnabled(plugin.name));
    const [expanded, setExpanded] = React.useState(false);
    const [hover, setHover] = React.useState(false);

    const needsRestart = pluginRequiresRestart(plugin);
    const hasSettings = plugin.settings != null;

    const toggle = async (next: boolean) => {
        setPluginEnabled(plugin.name, next);
        setEnabled(next);

        if (needsRestart) {
            // Kod patch'i olan plugin'ler modül yüklenirken uygulandığı için
            // sonradan geri alınamıyor (plan §7.3).
            onRestartNeeded();
            return;
        }

        if (next) await startPlugin(plugin);
        else await stopPlugin(plugin);
    };

    return (
        <div
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                ...s.card,
                height: "100%",
                gap: space.sm,
                borderColor: hover ? c.borderStrong : c.border,
                boxShadow: hover ? shadow.mid : shadow.low,
                // Açık plugin'ler soldaki ince şeritle ayrışıyor — rozet gürültüsü yok.
                borderLeft: `3px solid ${enabled ? c.success : "transparent"}`
            }}
        >
            <div style={{ ...s.spread, alignItems: "flex-start" }}>
                <div style={{ minWidth: 0 }}>
                    <div
                        style={{
                            color: c.heading,
                            fontWeight: 600,
                            fontSize: "14px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap"
                        }}
                        title={plugin.name}
                    >
                        {plugin.name}
                    </div>
                    {plugin.required && (
                        <div style={{ ...s.faint, marginTop: "2px" }}>Çekirdek — kapatılamaz</div>
                    )}
                </div>

                <Toggle
                    checked={enabled}
                    disabled={plugin.required}
                    onChange={next => void toggle(next)}
                    label={`${plugin.name} aç/kapa`}
                />
            </div>

            <div
                style={{
                    ...s.muted,
                    // Üç satırda kes: kartlar aynı hizada kalsın.
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden"
                }}
                title={plugin.description}
            >
                {plugin.description}
            </div>

            {needsRestart && (
                <div style={{ ...s.badge, ...tint(c.warning), alignSelf: "flex-start" }}>
                    yeniden başlatma gerektirir
                </div>
            )}

            {(plugin.tags?.length ?? 0) > 0 && (
                <div style={{ ...s.row, flexWrap: "wrap", gap: space.xs }}>
                    {plugin.tags!.slice(0, 4).map(tag => (
                        <span key={tag} style={s.tag}>#{tag}</span>
                    ))}
                </div>
            )}

            {/* Alt satır her kartta aynı yerde: yazarlar solda, ayar düğmesi sağda. */}
            <div style={{ ...s.spread, marginTop: "auto", paddingTop: space.xs }}>
                <span style={{ ...s.faint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {plugin.authors.map(author => author.name).join(", ")}
                </span>

                {hasSettings && (
                    <button
                        style={{
                            ...s.button,
                            ...s.buttonGhost,
                            padding: "4px 10px",
                            fontSize: "12px",
                            color: expanded ? c.text : c.muted,
                            background: expanded ? c.surfaceActive : "transparent"
                        }}
                        onClick={() => setExpanded(value => !value)}
                        aria-expanded={expanded}
                    >
                        Ayarlar {expanded ? "▲" : "▼"}
                    </button>
                )}
            </div>

            {hasSettings && expanded && (
                <div
                    style={{
                        marginTop: space.xs,
                        paddingTop: space.md,
                        borderTop: `1px solid ${c.border}`,
                        borderRadius: radius.sm,
                        transition: `opacity ${motion}`
                    }}
                >
                    <SettingsPanel settings={plugin.settings!} />
                </div>
            )}
        </div>
    );
}
