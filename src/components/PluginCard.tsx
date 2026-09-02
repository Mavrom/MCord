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
import { IconChevronDown } from "./Icons";
import { SettingsPanel } from "./SettingControls";
import { c, radius, s, space, tint } from "./theme";
import { Toggle } from "./Toggle";

export function PluginCard({ plugin, onRestartNeeded }: {
    plugin: Plugin;
    onRestartNeeded(): void;
}) {
    const [enabled, setEnabled] = React.useState(() => isPluginEnabled(plugin.name));
    const [expanded, setExpanded] = React.useState(false);

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
            className="mcord-card"
            style={{
                ...s.card,
                height: "100%",
                gap: "10px",
                // Açık plugin'i renkle değil, hem şerit hem zeminle ayırıyoruz
                // (renk tek başına anlam taşımasın).
                borderLeft: `3px solid ${enabled ? c.success : "transparent"}`,
                background: enabled
                    ? `color-mix(in srgb, ${c.success} 5%, ${c.surfaceRaised})`
                    : c.surfaceRaised
            }}
        >
            <div style={{ ...s.spread, alignItems: "flex-start", gap: space.sm }}>
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
                    <div style={{ ...s.faint, marginTop: "2px" }}>
                        {plugin.authors.map(author => author.name).join(", ")}
                    </div>
                </div>

                {plugin.required
                    ? <span style={{ ...s.badge, ...tint(c.accent), flex: "0 0 auto" }}>çekirdek</span>
                    : (
                        <Toggle
                            checked={enabled}
                            onChange={next => void toggle(next)}
                            label={`${plugin.name} aç/kapa`}
                        />
                    )}
            </div>

            <p
                style={{
                    ...s.muted,
                    margin: 0,
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden"
                }}
                title={plugin.description}
            >
                {plugin.description}
            </p>

            {needsRestart && (
                <span style={{ ...s.badge, ...tint(c.warning), alignSelf: "flex-start" }}>
                    yeniden başlatma gerekir
                </span>
            )}

            {(plugin.tags?.length ?? 0) > 0 && (
                <div style={{ ...s.row, flexWrap: "wrap", gap: "6px" }}>
                    {plugin.tags!.slice(0, 4).map(tag => (
                        <span key={tag} style={s.tag}>#{tag}</span>
                    ))}
                </div>
            )}

            {hasSettings && (
                <>
                    {/* Alt satır her kartta aynı yerde — kartlar hizada kalıyor. */}
                    <button
                        className="mcord-btn mcord-ghost"
                        onClick={() => setExpanded(value => !value)}
                        aria-expanded={expanded}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "6px",
                            marginTop: "auto",
                            padding: "7px 10px",
                            borderRadius: radius.sm,
                            border: `1px solid ${expanded ? c.borderStrong : c.border}`,
                            background: expanded ? c.surfaceActive : "transparent",
                            color: expanded ? c.text : c.muted,
                            cursor: "pointer",
                            fontFamily: "inherit",
                            fontSize: "12px",
                            fontWeight: 600
                        }}
                    >
                        Ayarlar
                        <IconChevronDown
                            size={14}
                            style={{
                                transform: expanded ? "rotate(180deg)" : "none",
                                transition: "transform 140ms cubic-bezier(.2,.7,.3,1)"
                            }}
                        />
                    </button>

                    {expanded && (
                        <div
                            className="mcord-enter"
                            style={{ paddingTop: space.sm, borderTop: `1px solid ${c.border}` }}
                        >
                            <SettingsPanel settings={plugin.settings!} />
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
