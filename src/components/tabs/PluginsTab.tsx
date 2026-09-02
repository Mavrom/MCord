/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { isPluginEnabled, plugins } from "../../api/PluginManager";
import type { Plugin } from "../../utils/types";
import { React } from "../../webpack/react";
import { PluginCard } from "../PluginCard";
import { RestartBanner } from "../RestartBanner";
import { c, motion, radius, s, space } from "../theme";

type Category = "all" | "enabled" | "disabled" | "required";

const CATEGORIES: Array<{ id: Category; label: string }> = [
    { id: "all", label: "Tümü" },
    { id: "enabled", label: "Açık" },
    { id: "disabled", label: "Kapalı" },
    { id: "required", label: "Çekirdek" }
];

/** Discord'un ayar menüsündeki gibi segment kontrolü — ayrı ayrı düğme yerine. */
function Segmented({ value, onChange, counts }: {
    value: Category;
    onChange(next: Category): void;
    counts: Record<Category, number>;
}) {
    return (
        <div
            role="tablist"
            style={{
                display: "inline-flex",
                padding: "3px",
                gap: "2px",
                borderRadius: radius.md,
                background: c.inputBg,
                border: `1px solid ${c.border}`
            }}
        >
            {CATEGORIES.map(item => {
                const active = value === item.id;
                return (
                    <button
                        key={item.id}
                        role="tab"
                        aria-selected={active}
                        onClick={() => onChange(item.id)}
                        style={{
                            padding: "5px 12px",
                            borderRadius: radius.sm,
                            border: "none",
                            cursor: "pointer",
                            fontFamily: "inherit",
                            fontSize: "12px",
                            fontWeight: 600,
                            color: active ? c.heading : c.muted,
                            background: active ? c.surfaceActive : "transparent",
                            transition: `background ${motion}, color ${motion}`,
                            whiteSpace: "nowrap"
                        }}
                    >
                        {item.label}
                        <span style={{ marginLeft: "6px", opacity: .55, fontWeight: 500 }}>
                            {counts[item.id]}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

export function PluginsTab() {
    const [query, setQuery] = React.useState("");
    const [category, setCategory] = React.useState<Category>("all");
    const [restartNeeded, setRestartNeeded] = React.useState(false);
    const [focused, setFocused] = React.useState(false);

    const all = React.useMemo(
        () => Object.values(plugins).sort((a, b) => a.name.localeCompare(b.name, "tr")),
        []
    );

    const counts = React.useMemo(() => ({
        all: all.length,
        enabled: all.filter(p => isPluginEnabled(p.name)).length,
        disabled: all.filter(p => !isPluginEnabled(p.name)).length,
        required: all.filter(p => p.required).length
    }), [all, restartNeeded]);

    const visible = all.filter(plugin => matches(plugin, query, category));

    return (
        <div style={s.page}>
            <header style={{ display: "flex", flexDirection: "column", gap: space.xs }}>
                <h1 style={s.h1}>Pluginler</h1>
                <p style={s.muted}>
                    Küratörlü kütüphane — üçüncü parti kurulum yok, her şey depoda.
                </p>
            </header>

            {restartNeeded && <RestartBanner />}

            <div style={{ display: "flex", flexDirection: "column", gap: space.md }}>
                <div style={{ position: "relative" }}>
                    <span
                        aria-hidden
                        style={{
                            position: "absolute",
                            left: "12px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: c.faint,
                            fontSize: "13px",
                            pointerEvents: "none"
                        }}
                    >
                        ⌕
                    </span>
                    <input
                        style={{
                            ...s.input,
                            paddingLeft: "32px",
                            borderColor: focused ? c.accent : c.border
                        }}
                        type="search"
                        placeholder="Plugin, açıklama veya #etiket ara…"
                        value={query}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        onChange={event => setQuery(event.currentTarget.value)}
                    />
                </div>

                <div style={{ ...s.spread, flexWrap: "wrap", gap: space.sm }}>
                    <Segmented value={category} onChange={setCategory} counts={counts} />
                    <span style={s.faint}>{visible.length} sonuç</span>
                </div>
            </div>

            {visible.length === 0
                ? (
                    <div
                        style={{
                            ...s.panel,
                            textAlign: "center",
                            color: c.muted,
                            borderStyle: "dashed"
                        }}
                    >
                        Eşleşen plugin yok.
                    </div>
                )
                : (
                    <div style={s.grid}>
                        {visible.map(plugin => (
                            <PluginCard
                                key={plugin.name}
                                plugin={plugin}
                                onRestartNeeded={() => setRestartNeeded(true)}
                            />
                        ))}
                    </div>
                )}
        </div>
    );
}

function matches(plugin: Plugin, query: string, category: Category): boolean {
    if (category === "enabled" && !isPluginEnabled(plugin.name)) return false;
    if (category === "disabled" && isPluginEnabled(plugin.name)) return false;
    if (category === "required" && !plugin.required) return false;

    if (!query) return true;

    const needle = query.toLowerCase().replace(/^#/, "");
    return plugin.name.toLowerCase().includes(needle)
        || plugin.description.toLowerCase().includes(needle)
        || (plugin.tags ?? []).some(tag => tag.toLowerCase().includes(needle));
}
