/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { flushSettings } from "../api/settings";
import { IconAlert } from "./Icons";
import { c, s, space, tint } from "./theme";

/** Kod patch'i olan plugin açılıp kapatıldığında gösterilir (plan §7.3). */
export function RestartBanner() {
    return (
        <div
            className="mcord-enter"
            role="status"
            style={{
                ...s.card,
                ...tint(c.warning, ".10"),
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: space.md,
                color: c.text
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: space.sm, minWidth: 0 }}>
                <IconAlert size={20} style={{ color: c.warning }} />
                <div style={{ minWidth: 0 }}>
                    <div style={{ color: c.heading, fontWeight: 600, fontSize: "13px" }}>
                        Yeniden başlatma gerekiyor
                    </div>
                    <div style={s.faint}>
                        Kod patch'leri modül yüklenirken uygulanıyor, sonradan geri alınamıyor.
                    </div>
                </div>
            </div>

            <button
                className="mcord-btn"
                style={{ ...s.button, background: c.warning, color: "#000", flex: "0 0 auto" }}
                onClick={() => {
                    flushSettings();
                    void window.McordNative.app.relaunch();
                }}
            >
                Şimdi Yeniden Başlat
            </button>
        </div>
    );
}
