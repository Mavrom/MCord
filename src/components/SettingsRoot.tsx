/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { React } from "../webpack/react";
import { AboutTab } from "./tabs/AboutTab";
import { GeneralTab } from "./tabs/GeneralTab";
import { PluginsTab } from "./tabs/PluginsTab";
import { UpdaterTab } from "./tabs/UpdaterTab";
import { c, motion, radius, s, space } from "./theme";

export const TABS = [
    { id: "plugins", label: "Pluginler", icon: "◧", Component: PluginsTab },
    { id: "general", label: "Genel", icon: "⚙", Component: GeneralTab },
    { id: "updater", label: "Güncelleme", icon: "↻", Component: UpdaterTab },
    { id: "about", label: "Hakkında", icon: "◈", Component: AboutTab }
] as const;

export type TabId = (typeof TABS)[number]["id"];

function NavItem({ tab, active, onSelect }: {
    tab: (typeof TABS)[number];
    active: boolean;
    onSelect(): void;
}) {
    const [hover, setHover] = React.useState(false);

    return (
        <button
            onClick={onSelect}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            aria-current={active}
            style={{
                display: "flex",
                alignItems: "center",
                gap: space.sm,
                width: "100%",
                padding: "9px 12px",
                borderRadius: radius.sm,
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "inherit",
                fontSize: "14px",
                fontWeight: active ? 600 : 500,
                color: active ? c.heading : c.muted,
                background: active ? c.surfaceActive : hover ? c.surfaceHover : "transparent",
                transition: `background ${motion}, color ${motion}`
            }}
        >
            <span aria-hidden style={{ opacity: active ? 1 : .6, fontSize: "13px" }}>{tab.icon}</span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {tab.label}
            </span>
        </button>
    );
}

/** Tek başına açılabilen ayar kabuğu — overlay ve Discord sekmesi ikisi de kullanıyor. */
export function SettingsRoot({ initialTab = "plugins" }: { initialTab?: TabId }) {
    const [active, setActive] = React.useState<TabId>(initialTab);

    const Current = TABS.find(tab => tab.id === active)?.Component ?? PluginsTab;

    return (
        <div
            style={{
                display: "flex",
                alignItems: "stretch",
                height: "100%",
                minHeight: 0,
                minWidth: 0,
                color: c.text,
                fontFamily: "var(--font-primary, 'gg sans', 'Segoe UI', system-ui, sans-serif)"
            }}
        >
            <nav
                style={{
                    flex: "0 0 auto",
                    width: "184px",
                    padding: space.md,
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                    borderRight: `1px solid ${c.border}`,
                    background: c.surface,
                    overflowY: "auto"
                }}
            >
                <div style={{ ...s.faint, padding: "4px 12px 8px", letterSpacing: ".06em", textTransform: "uppercase" }}>
                    MCord
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

            <div style={{ flex: 1, minWidth: 0, minHeight: 0, overflowY: "auto", padding: space.xl }}>
                <Current />
            </div>
        </div>
    );
}
