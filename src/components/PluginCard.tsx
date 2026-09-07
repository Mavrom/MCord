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
                minHeight: "126px",
                gap: space.sm,
                padding: space.md,
                borderLeft: `3px solid ${enabled ? c.success : "transparent"}`,
                background: enabled
                    ? `color-mix(in srgb, ${c.success} 6%, ${c.surfaceRaised})`
                    : c.surfaceRaised
            }}
        >
            <div style={{ display: "flex", alignItems: "flex-start", gap: space.sm }}>
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
                    style={{ flex: 1, minWidth: 0, cursor: hasSettings ? "pointer" : "default" }}
                >
                    <div
                        className="mcord-card-name"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "7px",
                            color: c.heading,
                            fontWeight: 600,
                            fontSize: "14px",
                            overflow: "hidden"
                        }}
                        title={plugin.name}
                    >
                        {enabled && (
                            <span
                                style={{
                                    flex: "0 0 auto",
                                    width: "6px",
                                    height: "6px",
                                    borderRadius: "50%",
                                    background: c.success
                                }}
                            />
                        )}
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {plugin.name}
                        </span>
                    </div>
                </div>

                {plugin.required
                    ? <span style={{ ...s.badge, ...tint(c.accent), flex: "0 0 auto" }}>çekirdek</span>
                    : (
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", flex: "0 0 auto" }}>
                            {hasSettings && (
                                <button
                                    className="mcord-btn mcord-ghost mcord-card-gear"
                                    onClick={openSettings}
                                    aria-label={`${plugin.name} ayarları`}
                                    title="Ayarlar"
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        width: "26px",
                                        height: "26px",
                                        padding: 0,
                                        border: "none",
                                        borderRadius: radius.sm,
                                        background: "transparent",
                                        color: c.faint,
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
                    margin: 0,
                    color: c.muted,
                    fontSize: "13px",
                    lineHeight: 1.5,
                    cursor: hasSettings ? "pointer" : "default",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden"
                }}
                title={plugin.description}
            >
                {plugin.description}
            </p>

            {(plugin.tags?.length ?? 0) > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginTop: "auto", paddingTop: "2px" }}>
                    {plugin.tags!.slice(0, 3).map(tag => (
                        <button
                            key={tag}
                            className="mcord-btn mcord-tag"
                            onClick={() => onPickTag(tag)}
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                padding: "3px 8px",
                                borderRadius: radius.pill,
                                border: "none",
                                background: c.surfaceHover,
                                color: c.faint,
                                fontFamily: "inherit",
                                fontSize: "11px",
                                fontWeight: 500,
                                cursor: "pointer",
                                whiteSpace: "nowrap"
                            }}
                        >
                            <span style={{ opacity: .55, marginRight: "1px" }}>#</span>{tag}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
