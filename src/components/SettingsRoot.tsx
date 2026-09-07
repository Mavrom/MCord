/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { React } from "../webpack/react";
import { IconDownload, IconInfo, IconPuzzle, IconRestart, IconSliders, LogoMark } from "./Icons";
import { relaunchDiscord, useRestartNeeded } from "./restartState";
import { injectStyles } from "./styles";
import { AboutTab } from "./tabs/AboutTab";
import { GeneralTab } from "./tabs/GeneralTab";
import { PluginsTab } from "./tabs/PluginsTab";
import { UpdaterTab } from "./tabs/UpdaterTab";
import { c, radius, space } from "./theme";

export const TABS = [
    { id: "plugins", label: "Pluginler", Icon: IconPuzzle, Component: PluginsTab },
    { id: "general", label: "Genel", Icon: IconSliders, Component: GeneralTab },
    { id: "updater", label: "Güncelleme", Icon: IconDownload, Component: UpdaterTab },
    { id: "about", label: "Hakkında", Icon: IconInfo, Component: AboutTab }
] as const;

export type TabId = (typeof TABS)[number]["id"];

function NavItem({ tab, active, onSelect }: {
    tab: (typeof TABS)[number];
    active: boolean;
    onSelect(): void;
}) {
    const { Icon } = tab;

    return (
        <button
            className="mcord-nav-item"
            onClick={onSelect}
            aria-current={active}
            style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                width: "100%",
                padding: "9px 10px",
                borderRadius: radius.sm,
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "inherit",
                fontSize: "14px",
                fontWeight: active ? 600 : 500,
                color: active ? c.heading : c.muted,
                background: active ? c.surfaceActive : "transparent"
            }}
        >
            <Icon size={18} style={{ opacity: active ? 1 : .75 }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {tab.label}
            </span>
        </button>
    );
}

/** Tek başına açılabilen ayar kabuğu — overlay ve Discord sekmesi ikisi de kullanıyor. */
export function SettingsRoot({ initialTab = "plugins" }: { initialTab?: TabId }) {
    const [active, setActive] = React.useState<TabId>(initialTab);
    const restartNeeded = useRestartNeeded();

    // Discord'un ayar sekmesi olarak gömüldüğünde overlay'den geçmiyoruz.
    React.useEffect(() => injectStyles(), []);

    const Current = TABS.find(tab => tab.id === active)?.Component ?? PluginsTab;

    return (
        <div
            className="mcord-root"
            style={{
                display: "flex",
                alignItems: "stretch",
                flex: 1,
                minHeight: 0,
                minWidth: 0,
                color: c.text,
                fontFamily: "var(--font-primary, 'gg sans', 'Segoe UI', system-ui, sans-serif)",
                fontSize: "14px",
                lineHeight: 1.45
            }}
        >
            <nav
                style={{
                    flex: "0 0 auto",
                    width: "208px",
                    padding: `${space.lg} ${space.md}`,
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                    borderRight: `1px solid ${c.border}`,
                    background: c.surfaceRaised,
                    overflowY: "auto"
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: `0 ${space.sm} ${space.lg}`
                    }}
                >
                    <LogoMark size={26} />
                    <div style={{ minWidth: 0 }}>
                        <div style={{ color: c.heading, fontWeight: 700, fontSize: "15px", letterSpacing: "-.01em" }}>
                            MCord
                        </div>
                        <div style={{ color: c.faint, fontSize: "11px" }}>v{VERSION}</div>
                    </div>

                    {restartNeeded && (
                        <button
                            className="mcord-btn"
                            onClick={relaunchDiscord}
                            title="Bir plugin için yeniden başlatma gerekiyor — tıkla"
                            aria-label="Discord'u yeniden başlat"
                            style={{
                                marginLeft: "auto",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "28px",
                                height: "28px",
                                flex: "0 0 auto",
                                padding: 0,
                                borderRadius: radius.sm,
                                border: `1px solid ${c.warning}`,
                                background: `color-mix(in srgb, ${c.warning} 14%, transparent)`,
                                color: c.warning,
                                cursor: "pointer"
                            }}
                        >
                            <IconRestart size={15} />
                        </button>
                    )}
                </div>

                {TABS.map(tab => (
                    <NavItem
                        key={tab.id}
                        tab={tab}
                        active={active === tab.id}
                        onSelect={() => setActive(tab.id)}
                    />
                ))}
            </nav>

            <div
                key={active}
                className="mcord-enter"
                style={{
                    flex: 1,
                    minWidth: 0,
                    minHeight: 0,
                    overflowY: "auto",
                    padding: `${space.xl} ${space.xl} 40px`
                }}
            >
                <Current />
            </div>
        </div>
    );
}
