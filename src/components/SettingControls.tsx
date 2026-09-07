/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { resolveSettingFlag } from "../api/settings";
import {
    type DefinedSettings,
    OptionType,
    type PluginSetting,
    type SelectSetting,
    type SliderSetting
} from "../utils/types";
import { React } from "../webpack/react";
import { markRestartNeeded } from "./restartState";
import { c, s } from "./theme";
import { Toggle } from "./Toggle";

/**
 * Ayar UI'ı `definePluginSettings` tanımından **otomatik üretiliyor** —
 * plugin başına ayar ekranı yazılmıyor (plan §7.1).
 */
export function SettingsPanel({ settings }: { settings: DefinedSettings }) {
    const entries = Object.entries(settings.def)
        .filter(([, setting]) => !resolveSettingFlag(setting.hidden))
        .filter(([, setting]) => setting.type !== OptionType.CUSTOM);

    if (entries.length === 0) {
        return <div style={s.muted}>Bu plugin'in ayarlanabilir seçeneği yok.</div>;
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {entries.map(([key, setting]) => (
                <SettingRow key={key} settings={settings} settingKey={key} setting={setting} />
            ))}
        </div>
    );
}

function SettingRow(props: { settings: DefinedSettings; settingKey: string; setting: PluginSetting }) {
    const { settings, settingKey, setting } = props;

    const [value, setValueState] = React.useState(() => (settings.store as any)[settingKey]);
    const [error, setError] = React.useState<string | null>(null);

    const disabled = resolveSettingFlag(setting.disabled);

    const commit = (newValue: unknown) => {
        const validation = setting.isValid?.(newValue as never);

        if (validation !== undefined && validation !== true) {
            setError(typeof validation === "string" ? validation : "Geçersiz değer");
            return;
        }

        setError(null);
        (settings.store as any)[settingKey] = newValue;
        setValueState(newValue);

        if (setting.restartNeeded) markRestartNeeded();
    };

    return (
        <div style={{ ...s.card, opacity: disabled ? 0.5 : 1 }}>
            <div style={s.spread}>
                <div>
                    <div style={{ color: c.heading, fontWeight: 500 }}>{settingKey}</div>
                    <div style={s.muted}>{setting.description}</div>
                </div>
            </div>

            <Control setting={setting} value={value} disabled={disabled} onChange={commit} />

            {error && <div style={{ ...s.muted, color: c.danger }}>{error}</div>}
        </div>
    );
}

function Control(props: {
    setting: PluginSetting;
    value: unknown;
    disabled: boolean;
    onChange(value: unknown): void;
}) {
    const { setting, value, disabled, onChange } = props;

    switch (setting.type) {
        case OptionType.BOOLEAN:
            return (
                <div style={s.row}>
                    <Toggle
                        checked={value === true}
                        disabled={disabled}
                        onChange={next => onChange(next)}
                        label={setting.description ?? "Ayar"}
                    />
                    <span style={s.muted}>{value === true ? "Açık" : "Kapalı"}</span>
                </div>
            );

        case OptionType.SELECT: {
            const select = setting as SelectSetting;
            return (
                <select
                    style={s.input}
                    value={String(value)}
                    disabled={disabled}
                    onChange={event => {
                        const chosen = select.options.find(o => String(o.value) === event.currentTarget.value);
                        onChange(chosen?.value);
                    }}
                >
                    {select.options.map(option => (
                        <option key={String(option.value)} value={String(option.value)}>
                            {option.label}
                        </option>
                    ))}
                </select>
            );
        }

        case OptionType.NUMBER:
        case OptionType.BIGINT:
            return (
                <input
                    style={s.input}
                    type="number"
                    value={String(value ?? "")}
                    disabled={disabled}
                    onChange={event => onChange(Number(event.currentTarget.value))}
                />
            );

        case OptionType.SLIDER: {
            const slider = setting as SliderSetting;
            const markers = slider.markers;
            return (
                <div style={s.row}>
                    <input
                        style={{ flex: 1 }}
                        type="range"
                        min={markers[0]}
                        max={markers.at(-1)}
                        step={slider.stickToMarkers ? undefined : "any"}
                        value={Number(value ?? markers[0])}
                        disabled={disabled}
                        onChange={event => onChange(Number(event.currentTarget.value))}
                    />
                    <span style={s.muted}>{String(value)}</span>
                </div>
            );
        }

        case OptionType.COMPONENT:
            return setting.component({
                setValue: onChange,
                setError: () => { },
                option: setting
            });

        case OptionType.STRING:
        default:
            return (
                <input
                    style={s.input}
                    type="text"
                    value={String(value ?? "")}
                    placeholder={(setting as any).placeholder}
                    disabled={disabled}
                    onChange={event => onChange(event.currentTarget.value)}
                />
            );
    }
}
