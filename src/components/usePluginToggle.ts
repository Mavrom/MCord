/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import {
    isPluginEnabled,
    pluginRequiresRestart,
    setPluginEnabled,
    startPlugin,
    stopPlugin
} from "../api/PluginManager";
import type { Plugin } from "../utils/types";
import { React } from "../webpack/react";
import { markRestartNeeded } from "./restartState";

/**
 * Plugin aç/kapa mantığı — hem kart hem ayrıntı ekranı aynı davranışı kullansın
 * diye tek yerde.
 */
export function usePluginToggle(plugin: Plugin, onChanged?: () => void) {
    const [enabled, setEnabled] = React.useState(() => isPluginEnabled(plugin.name));
    const needsRestart = pluginRequiresRestart(plugin);

    const toggle = async (next: boolean) => {
        setPluginEnabled(plugin.name, next);
        setEnabled(next);
        onChanged?.();

        if (needsRestart) {
            // Kod patch'li plugin'ler modül yüklenirken uygulanıyor, sonradan geri
            // alınamıyor (plan §7.3) — sol üstteki başlıkta restart butonu belirir.
            markRestartNeeded();
            return;
        }

        if (next) await startPlugin(plugin);
        else await stopPlugin(plugin);
    };

    return { enabled, toggle, needsRestart };
}
