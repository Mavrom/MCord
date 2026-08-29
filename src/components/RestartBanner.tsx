/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { flushSettings } from "../api/settings";
import { c, s } from "./theme";

/** Kod patch'i olan plugin açılıp kapatıldığında gösterilir (plan §7.3). */
export function RestartBanner() {
    return (
        <div style={{ ...s.card, borderLeft: `3px solid ${c.warning}` }}>
            <div style={s.spread}>
                <div>
                    <div style={{ color: c.heading, fontWeight: 500 }}>Yeniden başlatma gerekiyor</div>
                    <div style={s.muted}>
                        Kod patch'leri modül yüklenirken uygulanıyor, sonradan geri alınamıyor.
                    </div>
                </div>
                <button
                    style={s.button}
                    onClick={() => {
                        flushSettings();
                        void window.McordNative.app.relaunch();
                    }}
                >
                    Şimdi Yeniden Başlat
                </button>
            </div>
        </div>
    );
}
