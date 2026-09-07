/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import type { Plugin } from "../utils/types";
import { IconGear, IconInfo } from "./Icons";
import { c, radius, s, space, tint } from "./theme";
import { Toggle } from "./Toggle";
import { usePluginToggle } from "./usePluginToggle";

const iconButtonStyle = {
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
} as const;

export function PluginCard({ plugin, onChanged, onOpenDetail, onPickTag }: {
    plugin: Plugin;
    onChanged(): void;
    onOpenDetail(plugin: Plugin): void;
    onPickTag(tag: string): void;
}) {
    const { enabled, toggle } = usePluginToggle(plugin, onChanged);

    const hasSettings = plugin.settings != null;
    const openDetail = () => onOpenDetail(plugin);

    return (
        <div
            className="mcord-card"
            style={{
                ...s.card,
                width: "100%",
                height: "100%",
                minHeight: "132px",
                gap: space.sm,
                padding: space.md,
                borderLeft: `3px solid ${enabled
                    ? c.success
                    : `color-mix(in srgb, ${c.danger} 55%, transparent)`}`,
                background: enabled
                    ? `color-mix(in srgb, ${c.success} 6%, ${c.surfaceRaised})`
                    : `color-mix(in srgb, ${c.danger} 4%, ${c.surfaceRaised})`
            }}
        >
            <div style={{ display: "flex", alignItems: "flex-start", gap: space.sm }}>
                <div
                    role="button"
                    tabIndex={0}
                    onClick={openDetail}
                    onKeyDown={event => {
                        if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openDetail();
                        }
                    }}
                    style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
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
                        <span
                            style={{
                                flex: "0 0 auto",
                                width: "6px",
                                height: "6px",
                                borderRadius: "50%",
                                background: enabled ? c.success : c.danger
                            }}
                        />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {plugin.name}
                        </span>
                    </div>
                </div>

                {plugin.required
                    ? <span style={{ ...s.badge, ...tint(c.accent), flex: "0 0 auto" }}>çekirdek</span>
                    : (
                        <div style={{ display: "flex", alignItems: "center", gap: "2px", flex: "0 0 auto" }}>
                            <button
                                className="mcord-btn mcord-ghost mcord-card-gear"
                                onClick={openDetail}
                                aria-label={`${plugin.name} hakkında`}
                                title="Bilgi"
                                style={iconButtonStyle}
                            >
                                <IconInfo size={15} />
                            </button>
                            {hasSettings && (
                                <button
                                    className="mcord-btn mcord-ghost mcord-card-gear"
                                    onClick={openDetail}
                                    aria-label={`${plugin.name} ayarları`}
                                    title="Ayarlar"
                                    style={iconButtonStyle}
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
                onClick={openDetail}
                style={{
                    margin: 0,
                    color: c.muted,
                    fontSize: "13px",
                    lineHeight: 1.5,
                    cursor: "pointer",
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
