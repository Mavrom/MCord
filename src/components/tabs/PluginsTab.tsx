/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { isPluginEnabled, plugins } from "../../api/PluginManager";
import type { Plugin } from "../../utils/types";
import { React } from "../../webpack/react";
import { IconClose, IconSearch, IconSearchOff } from "../Icons";
import { PluginCard } from "../PluginCard";
import { PluginSettingsPopover } from "../PluginSettingsPopover";
import { c, radius, s, space } from "../theme";

type Status = "all" | "enabled" | "disabled";

/**
 * Küratörlü kategoriler — plugin `tags`'lerinin üstüne insanca bir katman.
 * Etiketler tutarsız (eglence/eğlence, ui'ın her yerde olması) olduğu için
 * burada elle grupluyoruz; bir kategori birden çok etiketi kapsayabilir.
 */
const CATEGORIES: Array<{ id: string; label: string; tags: string[] }> = [
    { id: "appearance", label: "Görünüm", tags: ["görünüm", "ui", "özelleştirme", "profil", "tema"] },
    { id: "messages", label: "Mesajlar", tags: ["mesaj", "bahsetme", "reaksiyon", "alıntı"] },
    { id: "commands", label: "Komutlar", tags: ["komut"] },
    { id: "media", label: "Medya & GIF", tags: ["medya", "gif", "emoji", "çıkartma", "sticker", "resim", "dosya"] },
    { id: "fun", label: "Eğlence", tags: ["eglence", "eğlence"] },
    { id: "server", label: "Sunucu & Rol", tags: ["sunucu", "rol", "izin"] },
    { id: "voice", label: "Ses & Arama", tags: ["ses", "arama", "yayın", "aktivite", "durum"] },
    { id: "privacy", label: "Gizlilik", tags: ["gizlilik", "güvenlik"] },
    { id: "qol", label: "Kalite yaşam", tags: ["kalite-yasam", "kullanışlılık", "kısayol", "yardımcı", "bildirim", "arkadaşlar"] },
    { id: "dev", label: "Geliştirici", tags: ["geliştirici", "gelistirici", "konsol", "performans"] }
];

const CATEGORY_BY_TAG = new Map<string, string>();
for (const cat of CATEGORIES) {
    for (const tag of cat.tags) CATEGORY_BY_TAG.set(tag, cat.id);
}

/** Yatay kaydırılabilir, seçilebilir çip satırı. */
function Chips({ children }: { children: React.ReactNode }) {
    return (
        <div
            style={{
                display: "flex",
                gap: "6px",
                overflowX: "auto",
                paddingBottom: "2px",
                scrollbarWidth: "none",
                WebkitMaskImage: "linear-gradient(90deg, #000 calc(100% - 24px), transparent)"
            }}
        >
            {children}
        </div>
    );
}

function Chip({ active, onClick, children, count }: {
    active: boolean;
    onClick(): void;
    children: React.ReactNode;
    count?: number;
}) {
    return (
        <button
            className={`mcord-chip${active ? " is-active" : ""}`}
            aria-pressed={active}
            onClick={onClick}
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                flex: "0 0 auto",
                padding: "7px 13px",
                borderRadius: radius.pill,
                border: "1px solid transparent",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: "12.5px",
                fontWeight: 600,
                whiteSpace: "nowrap",
                color: active ? c.onAccent : c.muted,
                background: active ? c.accent : c.surfaceRaised,
                boxShadow: active ? `0 4px 14px color-mix(in srgb, ${c.accent} 45%, transparent)` : "none"
            }}
        >
            {children}
            {count != null && count > 0 && (
                <span
                    style={{
                        fontVariantNumeric: "tabular-nums",
                        fontWeight: 600,
                        fontSize: "11px",
                        padding: "1px 6px",
                        borderRadius: radius.pill,
                        background: active ? "rgba(255,255,255,.22)" : c.surfaceActive,
                        color: active ? c.onAccent : c.faint
                    }}
                >
                    {count}
                </span>
            )}
        </button>
    );
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/** Sol kenardaki A–Z atlama şeridi. */
function AlphaRail({ present, onPick }: { present: Set<string>; onPick(letter: string): void }) {
    return (
        <div
            style={{
                position: "sticky",
                top: space.md,
                alignSelf: "flex-start",
                flex: "0 0 auto",
                display: "flex",
                flexDirection: "column",
                gap: "1px",
                padding: `${space.md} 3px`
            }}
        >
            {ALPHABET.map(letter => {
                const has = present.has(letter);
                return (
                    <button
                        key={letter}
                        className="mcord-alpha"
                        disabled={!has}
                        onClick={() => onPick(letter)}
                        style={{
                            width: "16px",
                            height: "15px",
                            padding: 0,
                            border: "none",
                            borderRadius: "3px",
                            background: "transparent",
                            color: c.muted,
                            opacity: has ? 1 : .28,
                            font: "700 9.5px/15px inherit",
                            fontFamily: "inherit",
                            textAlign: "center",
                            cursor: has ? "pointer" : "default"
                        }}
                    >
                        {letter}
                    </button>
                );
            })}
        </div>
    );
}

export function PluginsTab() {
    const [query, setQuery] = React.useState("");
    const [status, setStatus] = React.useState<Status>("all");
    const [category, setCategory] = React.useState<string | null>(null);
    const [tick, bump] = React.useReducer((n: number) => n + 1, 0);
    const [focused, setFocused] = React.useState(false);
    const [detail, setDetail] = React.useState<Plugin | null>(null);

    const inputRef = React.useRef<HTMLInputElement>(null);
    const rootRef = React.useRef<HTMLDivElement>(null);

    // "/" ile aramaya odaklan — bir şey yazarken değilken.
    React.useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            const typing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";
            if (event.key === "/" && !typing) {
                event.preventDefault();
                inputRef.current?.focus();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    // Çekirdek plugin'ler (`required`) listelenmiyor: kapatılamıyor, ayarları
    // yok — arka planda çalışıyorlar.
    const all = React.useMemo(
        () => Object.values(plugins)
            .filter(plugin => !plugin.required)
            .sort((a, b) => a.name.localeCompare(b.name, "tr")),
        []
    );

    const enabledCount = React.useMemo(
        () => all.filter(p => isPluginEnabled(p.name)).length,
        [all, tick]
    );

    const categoryCounts = React.useMemo(() => {
        const counts = new Map<string, number>();
        for (const plugin of all) {
            const seen = new Set<string>();
            for (const tag of plugin.tags ?? []) {
                const id = CATEGORY_BY_TAG.get(tag);
                if (id && !seen.has(id)) {
                    seen.add(id);
                    counts.set(id, (counts.get(id) ?? 0) + 1);
                }
            }
        }
        return counts;
    }, [all]);

    const visible = React.useMemo(
        () => all.filter(plugin => matches(plugin, query, status, category)),
        [all, query, status, category, tick]
    );

    // Her harf için görünen listedeki ilk plugin (atlama hedefi).
    const letterLeaders = React.useMemo(() => {
        const map: Record<string, string> = {};
        for (const plugin of visible) {
            const letter = plugin.name[0]?.toUpperCase() ?? "";
            if (letter && !(letter in map)) map[letter] = plugin.name;
        }
        return map;
    }, [visible]);

    const presentLetters = React.useMemo(() => new Set(Object.keys(letterLeaders)), [letterLeaders]);

    const jumpToLetter = (letter: string) => {
        rootRef.current
            ?.querySelector(`[data-letter="${letter}"]`)
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const clearFilters = () => {
        setQuery("");
        setStatus("all");
        setCategory(null);
    };

    const filtered = query !== "" || status !== "all" || category != null;

    return (
        <div ref={rootRef} style={{ display: "flex", minHeight: "100%" }}>
            <AlphaRail present={presentLetters} onPick={jumpToLetter} />

            <div style={{ ...s.page, paddingTop: 0, flex: 1, minWidth: 0 }}>
                <header
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                        paddingTop: space.xl
                    }}
                >
                    <div style={{ ...s.spread, alignItems: "baseline" }}>
                        <h1 style={s.h1}>Pluginler</h1>
                        <span style={{ ...s.faint, fontVariantNumeric: "tabular-nums" }}>
                            {enabledCount} açık · {all.length} plugin
                        </span>
                    </div>
                    <p style={s.muted}>
                        Beğendiğini aç, gerisini keşfet. Hepsi elden geçti — üçüncü parti kurulum yok.
                    </p>
                </header>

                {/* Kaydırırken tepede kalan araç çubuğu */}
                <div
                    style={{
                        position: "sticky",
                        top: 0,
                        zIndex: 5,
                        display: "flex",
                        flexDirection: "column",
                        gap: space.sm,
                        margin: `0 -${space.xl} 0 0`,
                        padding: `${space.md} ${space.xl} ${space.md} 0`,
                        background: c.surface,
                        borderBottom: `1px solid ${c.border}`
                    }}
                >
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
                            ref={inputRef}
                            style={{
                                ...s.input,
                                paddingLeft: "38px",
                                paddingRight: query ? "38px" : "12px",
                                borderColor: focused ? c.accent : c.border,
                                background: focused ? c.surfaceRaised : c.inputBg
                            }}
                            type="search"
                            aria-label="Plugin ara"
                            placeholder="Ne arıyorsun?  ( / )"
                            value={query}
                            onFocus={() => setFocused(true)}
                            onBlur={() => setFocused(false)}
                            onChange={event => setQuery(event.currentTarget.value)}
                        />
                        {query && (
                            <button
                                className="mcord-btn mcord-ghost"
                                onClick={() => { setQuery(""); inputRef.current?.focus(); }}
                                aria-label="Aramayı temizle"
                                style={{
                                    position: "absolute",
                                    right: "6px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: "26px",
                                    height: "26px",
                                    padding: 0,
                                    border: "none",
                                    borderRadius: radius.sm,
                                    background: "transparent",
                                    color: c.muted,
                                    cursor: "pointer"
                                }}
                            >
                                <IconClose size={14} />
                            </button>
                        )}
                    </div>

                    <Chips>
                        <Chip active={category == null && status === "all"} onClick={clearFilters}>
                            Tümü
                        </Chip>
                        <Chip active={status === "enabled"} onClick={() => setStatus(status === "enabled" ? "all" : "enabled")}>
                            Açıklar
                        </Chip>
                        <span style={{ flex: "0 0 auto", width: "1px", background: c.border, margin: "4px 2px" }} />
                        {CATEGORIES.map(cat => (
                            <Chip
                                key={cat.id}
                                active={category === cat.id}
                                count={categoryCounts.get(cat.id) ?? 0}
                                onClick={() => setCategory(category === cat.id ? null : cat.id)}
                            >
                                {cat.label}
                            </Chip>
                        ))}
                    </Chips>
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
                            <div style={{ color: c.heading, fontWeight: 600 }}>Buna uyan plugin yok</div>
                            <div style={s.faint}>Aramayı ya da kategoriyi biraz gevşet.</div>
                            {filtered && (
                                <button
                                    className="mcord-btn"
                                    onClick={clearFilters}
                                    style={{ ...s.button, ...s.buttonSecondary, marginTop: space.sm }}
                                >
                                    Filtreleri temizle
                                </button>
                            )}
                        </div>
                    )
                    : (
                        <div style={s.grid}>
                            {visible.map((plugin, index) => {
                                const letter = plugin.name[0]?.toUpperCase() ?? "";
                                const isLeader = letterLeaders[letter] === plugin.name;
                                return (
                                    <React.Fragment key={plugin.name}>
                                        {isLeader && (
                                            <div
                                                data-letter={letter}
                                                style={{
                                                    gridColumn: "1 / -1",
                                                    scrollMarginTop: "112px",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    gap: space.md,
                                                    margin: index === 0 ? 0 : "6px 0 2px",
                                                    height: index === 0 ? 0 : "auto"
                                                }}
                                            >
                                                {index > 0 && (
                                                    <>
                                                        <span style={{ width: "44px", height: "1px", background: c.border }} />
                                                        <span
                                                            style={{
                                                                color: c.faint,
                                                                fontSize: "11px",
                                                                fontWeight: 700,
                                                                letterSpacing: ".1em"
                                                            }}
                                                        >
                                                            {letter}
                                                        </span>
                                                        <span style={{ width: "44px", height: "1px", background: c.border }} />
                                                    </>
                                                )}
                                            </div>
                                        )}
                                        <PluginCard
                                            plugin={plugin}
                                            onChanged={bump}
                                            onOpenDetail={setDetail}
                                            onPickTag={tag => {
                                                const catId = CATEGORY_BY_TAG.get(tag);
                                                if (catId) setCategory(catId);
                                                else setQuery(`#${tag}`);
                                            }}
                                        />
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    )}

                {detail != null && (
                    <PluginSettingsPopover
                        plugin={detail}
                        onClose={() => setDetail(null)}
                        onChanged={bump}
                    />
                )}
            </div>
        </div>
    );
}

function matches(plugin: Plugin, query: string, status: Status, category: string | null): boolean {
    if (status === "enabled" && !isPluginEnabled(plugin.name)) return false;
    if (status === "disabled" && isPluginEnabled(plugin.name)) return false;

    if (category != null) {
        const cat = CATEGORIES.find(entry => entry.id === category);
        if (cat && !(plugin.tags ?? []).some(tag => cat.tags.includes(tag))) return false;
    }

    if (!query) return true;

    const needle = query.toLowerCase().replace(/^#/, "").trim();
    if (!needle) return true;

    return plugin.name.toLowerCase().includes(needle)
        || plugin.description.toLowerCase().includes(needle)
        || (plugin.tags ?? []).some(tag => tag.toLowerCase().includes(needle));
}
