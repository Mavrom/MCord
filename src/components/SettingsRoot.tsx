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
import { c, s } from "./theme";

export const TABS = [
    { id: "plugins", label: "Pluginler", Component: PluginsTab },
    { id: "general", label: "Genel", Component: GeneralTab },
    { id: "updater", label: "Güncelleme", Component: UpdaterTab },
    { id: "about", label: "Hakkında", Component: AboutTab }
] as const;

export type TabId = (typeof TABS)[number]["id"];

/** Tek başına açılabilen ayar kabuğu — modal ve Discord sekmesi ikisi de kullanıyor. */
export function SettingsRoot({ initialTab = "plugins" }: { initialTab?: TabId }) {
    const [active, setActive] = React.useState<TabId>(initialTab);

    const Current = TABS.find(tab => tab.id === active)?.Component ?? PluginsTab;

    return (
        <div style={{ ...s.page, padding: "16px", minWidth: 0 }}>
            <div style={{ ...s.row, borderBottom: `1px solid ${c.border}`, paddingBottom: "8px" }}>
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        style={{
                            ...s.button,
                            ...(active === tab.id ? {} : s.buttonSecondary),
                            padding: "6px 12px"
                        }}
                        onClick={() => setActive(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <Current />
        </div>
    );
}
