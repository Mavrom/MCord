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
import { c, s } from "./theme";

export function PluginCard({ plugin, onRestartNeeded }: {
    plugin: Plugin;
    onRestartNeeded(): void;
}) {
    const [enabled, setEnabled] = React.useState(() => isPluginEnabled(plugin.name));
    const [expanded, setExpanded] = React.useState(false);

    const needsRestart = pluginRequiresRestart(plugin);
    const hasSettings = plugin.settings != null;

    const toggle = async () => {
        const next = !enabled;

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
        <div style={s.card}>
            <div style={s.spread}>
                <div style={s.row}>
                    <span style={{ color: c.heading, fontWeight: 600 }}>{plugin.name}</span>
                    {needsRestart && (
                        <span style={{ ...s.badge, background: c.warning, color: "#000" }}>
                            yeniden başlat
                        </span>
                    )}
                    {plugin.required && (
                        <span style={{ ...s.badge, background: c.border, color: c.muted }}>
                            zorunlu
                        </span>
                    )}
                </div>

                <input
                    type="checkbox"
                    checked={enabled}
                    disabled={plugin.required}
                    onChange={() => void toggle()}
                    aria-label={`${plugin.name} aç/kapa`}
                />
            </div>

            <div style={s.muted}>{plugin.description}</div>

            <div style={{ ...s.row, flexWrap: "wrap" }}>
                {plugin.authors.map(author => (
                    <span key={author.name} style={s.tag}>{author.name}</span>
                ))}
                {plugin.tags?.map(tag => (
                    <span key={tag} style={s.tag}>#{tag}</span>
                ))}
            </div>

            {hasSettings && (
                <>
                    <button
                        style={{ ...s.button, ...s.buttonSecondary, alignSelf: "flex-start" }}
                        onClick={() => setExpanded(value => !value)}
                    >
                        {expanded ? "Ayarları Gizle" : "Ayarlar"}
                    </button>
                    {expanded && <SettingsPanel settings={plugin.settings!} />}
                </>
            )}
        </div>
    );
}
