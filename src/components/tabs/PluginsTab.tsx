/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { isPluginEnabled, plugins } from "../../api/PluginManager";
import type { Plugin } from "../../utils/types";
import { React } from "../../webpack/react";
import { IconSearch, IconSearchOff } from "../Icons";
import { PluginCard } from "../PluginCard";
import { PluginDetail } from "../PluginDetail";
import { c, radius, s, space } from "../theme";

type Category = "all" | "enabled" | "disabled";

const CATEGORIES: Array<{ id: Category; label: string }> = [
    { id: "all", label: "Tümü" },
    { id: "enabled", label: "Açık" },
    { id: "disabled", label: "Kapalı" }
];

/** Sayaçlı segment kontrolü — ayrı ayrı düğme yerine tek bir grup. */
function Segmented({ value, onChange, counts }: {
    value: Category;
    onChange(next: Category): void;
    counts: Record<Category, number>;
}) {
    return (
        <div
            role="tablist"
            aria-label="Plugin filtresi"
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
                        className="mcord-btn"
                        role="tab"
                        aria-selected={active}
                        onClick={() => onChange(item.id)}
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "6px 12px",
                            borderRadius: radius.sm,
                            border: "none",
                            cursor: "pointer",
                            fontFamily: "inherit",
                            fontSize: "12px",
                            fontWeight: 600,
                            color: active ? c.heading : c.muted,
                            background: active ? c.surfaceActive : "transparent",
                            whiteSpace: "nowrap"
                        }}
                    >
                        {item.label}
                        <span
                            style={{
                                fontVariantNumeric: "tabular-nums",
                                fontSize: "11px",
                                fontWeight: 500,
                                opacity: .6
                            }}
                        >
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
    const [tick, bump] = React.useReducer((n: number) => n + 1, 0);
    const [focused, setFocused] = React.useState(false);
    const [detail, setDetail] = React.useState<Plugin | null>(null);

    // Çekirdek plugin'ler (`required`) listelenmiyor: kapatılamıyorlar, ayarları
    // yok ve kullanıcının onlarla bir işi olmuyor — arka planda çalışıyorlar.
    const all = React.useMemo(
        () => Object.values(plugins)
            .filter(plugin => !plugin.required)
            .sort((a, b) => a.name.localeCompare(b.name, "tr")),
        []
    );

    const counts = React.useMemo(() => ({
        all: all.length,
        enabled: all.filter(p => isPluginEnabled(p.name)).length,
        disabled: all.filter(p => !isPluginEnabled(p.name)).length
    }), [all, tick]);

    const visible = all.filter(plugin => matches(plugin, query, category));

    if (detail != null) {
        return (
            <PluginDetail
                plugin={detail}
                onBack={() => setDetail(null)}
                onChanged={bump}
            />
        );
    }

    return (
        <div style={s.page}>
            <header style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <h1 style={s.h1}>Pluginler</h1>
                <p style={s.muted}>
                    Küratörlü kütüphane — üçüncü parti kurulum yok, her şey depoda.
                </p>
            </header>

            <div style={{ display: "flex", flexDirection: "column", gap: space.md }}>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <span
                        style={{
                            position: "absolute",
                            left: "12px",
                            display: "flex",
                            color: focused ? c.accent : c.faint,
                            pointerEvents: "none",
                            transition: "color 140ms cubic-bezier(.2,.7,.3,1)"
                        }}
                    >
                        <IconSearch size={16} />
                    </span>
                    <input
                        style={{
                            ...s.input,
                            paddingLeft: "38px",
                            borderColor: focused ? c.accent : c.border,
                            background: focused ? c.surfaceRaised : c.inputBg
                        }}
                        type="search"
                        aria-label="Plugin ara"
                        placeholder="Plugin, açıklama veya #etiket ara…"
                        value={query}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        onChange={event => setQuery(event.currentTarget.value)}
                    />
                </div>

                <div style={{ ...s.spread, flexWrap: "wrap", gap: space.sm }}>
                    <Segmented value={category} onChange={setCategory} counts={counts} />
                    <span style={{ ...s.faint, fontVariantNumeric: "tabular-nums" }}>
                        {visible.length} sonuç
                    </span>
                </div>
            </div>

            {visible.length === 0
                ? (
                    <div
                        style={{
                            ...s.panel,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: space.sm,
                            padding: "48px 24px",
                            borderStyle: "dashed",
                            color: c.muted,
                            textAlign: "center"
                        }}
                    >
                        <IconSearchOff size={28} style={{ opacity: .5 }} />
                        <div style={{ color: c.heading, fontWeight: 600 }}>Eşleşen plugin yok</div>
                        <div style={s.faint}>Aramayı değiştir veya filtreyi “Tümü” yap.</div>
                    </div>
                )
                : (
                    <div style={s.grid}>
                        {visible.map(plugin => (
                            <PluginCard
                                key={plugin.name}
                                plugin={plugin}
                                onChanged={bump}
                                onOpenSettings={setDetail}
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

    if (!query) return true;

    const needle = query.toLowerCase().replace(/^#/, "");
    return plugin.name.toLowerCase().includes(needle)
        || plugin.description.toLowerCase().includes(needle)
        || (plugin.tags ?? []).some(tag => tag.toLowerCase().includes(needle));
}
