/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import type { Plugin } from "../utils/types";
import { IconArrowLeft } from "./Icons";
import { SettingsPanel } from "./SettingControls";
import { c, radius, s, space } from "./theme";
import { Toggle } from "./Toggle";
import { usePluginToggle } from "./usePluginToggle";

/**
 * Bir plugin'in ayar ekranı — kartın içinde aşağı doğru açılmak yerine tüm
 * içerik alanını kaplayan ayrı bir görünüm (master → detay).
 */
export function PluginDetail({ plugin, onBack, onChanged }: {
    plugin: Plugin;
    onBack(): void;
    onChanged(): void;
}) {
    const { enabled, toggle } = usePluginToggle(plugin, onChanged);

    return (
        <div style={{ ...s.page, gap: space.lg }}>
            <button
                className="mcord-btn mcord-ghost"
                onClick={onBack}
                style={{
                    alignSelf: "flex-start",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 10px 6px 6px",
                    borderRadius: radius.sm,
                    border: "none",
                    background: "transparent",
                    color: c.muted,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontSize: "13px",
                    fontWeight: 600
                }}
            >
                <IconArrowLeft size={16} />
                Pluginler
            </button>

            <header style={{ ...s.spread, alignItems: "flex-start", gap: space.md }}>
                <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
                    <h1 style={s.h1}>{plugin.name}</h1>
                    <div style={s.faint}>{plugin.authors.map(author => author.name).join(", ")}</div>
                    <p style={{ ...s.muted, marginTop: "4px" }}>{plugin.description}</p>
                </div>

                <Toggle
                    checked={enabled}
                    onChange={next => void toggle(next)}
                    label={`${plugin.name} aç/kapa`}
                />
            </header>

            {(plugin.tags?.length ?? 0) > 0 && (
                <div style={{ ...s.row, flexWrap: "wrap", gap: "6px" }}>
                    {plugin.tags!.map(tag => (
                        <span key={tag} style={s.tag}>#{tag}</span>
                    ))}
                </div>
            )}

            <div style={{ borderTop: `1px solid ${c.border}`, paddingTop: space.lg }}>
                {plugin.settings != null
                    ? <SettingsPanel settings={plugin.settings} />
                    : <div style={s.muted}>Bu plugin'in ayarlanabilir seçeneği yok.</div>}
            </div>
        </div>
    );
}
