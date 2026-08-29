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
import { c, s } from "../theme";

type Category = "all" | "enabled" | "disabled" | "required";

const CATEGORIES: Array<{ id: Category; label: string }> = [
    { id: "all", label: "Tümü" },
    { id: "enabled", label: "Açık" },
    { id: "disabled", label: "Kapalı" },
    { id: "required", label: "Zorunlu" }
];

export function PluginsTab() {
    const [query, setQuery] = React.useState("");
    const [category, setCategory] = React.useState<Category>("all");
    const [restartNeeded, setRestartNeeded] = React.useState(false);

    const all = React.useMemo(
        () => Object.values(plugins).sort((a, b) => a.name.localeCompare(b.name)),
        []
    );

    const visible = all.filter(plugin => matches(plugin, query, category));

    return (
        <div style={s.page}>
            <h1 style={s.h1}>Pluginler</h1>
            <div style={s.muted}>
                {all.length} plugin — küratörlü kütüphane, üçüncü parti kurulum yok.
            </div>

            {restartNeeded && <RestartBanner />}

            <input
                style={s.input}
                type="search"
                placeholder="Plugin ara…"
                value={query}
                onChange={event => setQuery(event.currentTarget.value)}
            />

            <div style={{ ...s.row, flexWrap: "wrap" }}>
                {CATEGORIES.map(item => (
                    <button
                        key={item.id}
                        style={{
                            ...s.button,
                            ...(category === item.id ? {} : s.buttonSecondary),
                            padding: "6px 12px"
                        }}
                        onClick={() => setCategory(item.id)}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            {visible.length === 0
                ? <div style={{ ...s.muted, color: c.muted }}>Eşleşen plugin yok.</div>
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

    const needle = query.toLowerCase();
    return plugin.name.toLowerCase().includes(needle)
        || plugin.description.toLowerCase().includes(needle)
        || (plugin.tags ?? []).some(tag => tag.toLowerCase().includes(needle));
}
