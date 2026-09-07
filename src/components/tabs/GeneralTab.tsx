/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { flushSettings, Settings } from "../../api/settings";
import { DefaultMainSettings, type MainSettings, type WindowsMaterial } from "../../shared/settingsTypes";
import { React } from "../../webpack/react";
import { markRestartNeeded } from "../restartState";
import { Segmented } from "../Segmented";
import { c, s } from "../theme";

const MATERIALS: Array<{ value: WindowsMaterial; label: string }> = [
    { value: "none", label: "Kapalı" },
    { value: "mica", label: "Mica" },
    { value: "acrylic", label: "Acrylic" },
    { value: "tabbed", label: "Tabbed" }
];

const TOGGLES: Array<{ key: keyof MainSettings; label: string; description: string }> = [
    {
        key: "frameless",
        label: "Çerçevesiz pencere",
        description: "Pencere çerçevesini tamamen kaldırır."
    },
    {
        key: "winNativeTitleBar",
        label: "Windows başlık çubuğu",
        description: "Discord'unki yerine Windows'un yerel başlık çubuğunu kullanır."
    },
    {
        key: "disableMinSize",
        label: "Minimum boyut sınırını kaldır",
        description: "Discord'un dayattığı minimum pencere boyutunu devre dışı bırakır."
    },
    {
        key: "transparent",
        label: "Şeffaf pencere",
        description: "Pencere arka planını şeffaf yapar."
    },
    {
        key: "disableBackgroundThrottling",
        label: "Arka plan boşaltmayı kapat",
        description: "Sekmeye dönünce yaşanan donmayı önler; karşılığında arka planda "
            + "CPU/pil tüketimi artar. Donma şikayeti pil şikayetinden daha yaygın."
    },
    {
        key: "enableDevTools",
        label: "DevTools",
        description: "Discord'un geliştirici araçlarını etkinleştirir."
    }
];

export function GeneralTab() {
    const [, forceRender] = React.useReducer((n: number) => n + 1, 0);

    const main = { ...DefaultMainSettings, ...(Settings.main as Partial<MainSettings>) };

    const update = (key: keyof MainSettings, value: unknown) => {
        (Settings.main as Record<string, unknown>)[key] = value;
        flushSettings();
        markRestartNeeded();
        forceRender();
    };

    return (
        <div style={s.page}>
            <h1 style={s.h1}>Genel</h1>
            <div style={s.muted}>Pencere ve başlangıç ayarları. Hepsi yeniden başlatma gerektirir.</div>

            <h2 style={s.h2}>Pencere</h2>

            {TOGGLES.map(toggle => (
                <div key={toggle.key} style={s.card}>
                    <div style={s.spread}>
                        <div>
                            <div style={{ color: c.heading, fontWeight: 500 }}>{toggle.label}</div>
                            <div style={s.muted}>{toggle.description}</div>
                        </div>
                        <input
                            type="checkbox"
                            checked={main[toggle.key] === true}
                            onChange={event => update(toggle.key, event.currentTarget.checked)}
                        />
                    </div>
                </div>
            ))}

            <div style={s.card}>
                <div style={{ color: c.heading, fontWeight: 500 }}>Windows arka plan materyali</div>
                <div style={{ ...s.muted, marginBottom: "4px" }}>
                    Windows 11'de pencere arka planına mica/acrylic efekti uygular.
                </div>
                <Segmented
                    value={main.windowsMaterial}
                    options={MATERIALS}
                    onChange={next => update("windowsMaterial", next)}
                />
            </div>

            <h2 style={s.h2}>Gelişmiş</h2>

            <div style={s.card}>
                <div style={s.spread}>
                    <div>
                        <div style={{ color: c.heading, fontWeight: 500 }}>Güvenli mod</div>
                        <div style={s.muted}>Tüm pluginleri kapatır. Sorun giderirken kullan.</div>
                    </div>
                    <input
                        type="checkbox"
                        checked={Settings.safeMode}
                        onChange={event => {
                            Settings.safeMode = event.currentTarget.checked;
                            flushSettings();
                            markRestartNeeded();
                            forceRender();
                        }}
                    />
                </div>
            </div>

            <div style={s.card}>
                <div style={s.spread}>
                    <div>
                        <div style={{ color: c.heading, fontWeight: 500 }}>Eager patch modu</div>
                        <div style={s.muted}>
                            Tüm patch'ler başlangıçta uygulanır: başlangıç yavaşlar, bellek azalır.
                        </div>
                    </div>
                    <input
                        type="checkbox"
                        checked={Settings.eagerPatches}
                        onChange={event => {
                            Settings.eagerPatches = event.currentTarget.checked;
                            flushSettings();
                            markRestartNeeded();
                            forceRender();
                        }}
                    />
                </div>
            </div>

            <button
                style={{ ...s.button, ...s.buttonSecondary, alignSelf: "flex-start" }}
                onClick={() => void window.McordNative.settings.openFolder()}
            >
                Ayar klasörünü aç
            </button>
        </div>
    );
}
