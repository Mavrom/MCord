/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import type { Plugin } from "../utils/types";
import { IconGear } from "./Icons";
import { c, radius, s, space, tint } from "./theme";
import { Toggle } from "./Toggle";
import { usePluginToggle } from "./usePluginToggle";

export function PluginCard({ plugin, onChanged, onOpenSettings, onPickTag }: {
    plugin: Plugin;
    onChanged(): void;
    onOpenSettings(plugin: Plugin): void;
    onPickTag(tag: string): void;
}) {
    const { enabled, toggle } = usePluginToggle(plugin, onChanged);

    const hasSettings = plugin.settings != null;
    const openSettings = () => hasSettings && onOpenSettings(plugin);

    return (
        <div
            className="mcord-card"
            style={{
                ...s.card,
                height: "100%",
                gap: "10px",
                borderLeft: `3px solid ${enabled ? c.success : "transparent"}`,
                background: enabled
                    ? `color-mix(in srgb, ${c.success} 5%, ${c.surfaceRaised})`
                    : c.surfaceRaised
            }}
        >
            <div style={{ ...s.spread, alignItems: "flex-start", gap: space.sm }}>
                <div
                    role={hasSettings ? "button" : undefined}
                    tabIndex={hasSettings ? 0 : undefined}
                    onClick={openSettings}
                    onKeyDown={hasSettings ? (event => {
                        if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openSettings();
                        }
                    }) : undefined}
                    style={{
                        minWidth: 0,
                        flex: 1,
                        cursor: hasSettings ? "pointer" : "default"
                    }}
                >
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
                </div>

                {plugin.required
                    ? <span style={{ ...s.badge, ...tint(c.accent), flex: "0 0 auto" }}>çekirdek</span>
                    : (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: "0 0 auto" }}>
                            {hasSettings && (
                                <button
                                    className="mcord-btn mcord-ghost"
                                    onClick={openSettings}
                                    aria-label={`${plugin.name} ayarları`}
                                    title="Ayarlar"
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        width: "28px",
                                        height: "28px",
                                        padding: 0,
                                        borderRadius: radius.sm,
                                        border: `1px solid ${c.border}`,
                                        background: "transparent",
                                        color: c.muted,
                                        cursor: "pointer"
                                    }}
                                >
                                    <IconGear size={15} />
                                </button>
                            )}
                            <Toggle
                                checked={enabled}
                                onChange={next => void toggle(next)}
                                label={`${plugin.name} aç/kapa`}
                            />
                        </div>
                    )}
            </div>

            <p
                onClick={openSettings}
                style={{
                    ...s.muted,
                    margin: 0,
                    cursor: hasSettings ? "pointer" : "default",
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden"
                }}
                title={plugin.description}
            >
                {plugin.description}
            </p>

            {(plugin.tags?.length ?? 0) > 0 && (
                <div style={{ ...s.row, flexWrap: "wrap", gap: "6px", marginTop: "auto" }}>
                    {plugin.tags!.slice(0, 4).map(tag => (
                        <button
                            key={tag}
                            className="mcord-btn mcord-tag"
                            onClick={() => onPickTag(tag)}
                            style={{
                                ...s.tag,
                                border: `1px solid ${c.border}`,
                                cursor: "pointer",
                                fontFamily: "inherit"
                            }}
                        >
                            #{tag}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
