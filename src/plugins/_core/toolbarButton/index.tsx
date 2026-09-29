/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/**
 * MCord'un kedi maskotunu sol sunucu şeridine, Discord logosunun (DM / ana
 * sayfa düğmesi) hemen altına koyar → tıkla → MCord ayarları açılır.
 *
 * Yerleşim ServerListAPI'nin `above` noktasıyla yapılıyor (home düğme
 * kümesinin sonu). `first` ile diğer `above` elemanlarından önce gelir.
 * Plugin adı ayar anahtarı olduğu için eski "ToolbarButton" adı korunuyor.
 */

import { addServerListElement, removeServerListElement } from "../../../api/serverList";
import { ErrorBoundary } from "../../../components/ErrorBoundary";
import { ShadowCat } from "../../../components/ShadowCat";
import { Devs } from "../../../utils/constants";
import { definePlugin } from "../../../utils/types";
import { toggleSettings } from "../settings";

const ELEMENT_ID = "McordMascot";

function MascotButton() {
    return (
        <div style={{ flex: "0 0 auto", display: "flex", justifyContent: "center", margin: "4px 0 2px" }}>
            <button
                type="button"
                onClick={() => toggleSettings()}
                title="MCord ayarları (Ctrl+Alt+M)"
                aria-label="MCord ayarlarını aç"
                style={{
                    width: 48,
                    height: 48,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                    border: 0,
                    borderRadius: 16,
                    cursor: "pointer",
                    background: "transparent"
                }}
            >
                <ShadowCat size={42} />
            </button>
        </div>
    );
}

const WrappedMascot = ErrorBoundary.wrap(MascotButton, { noop: true });

export default definePlugin({
    name: "ToolbarButton",
    description: "Sunucu şeridine, Discord logosunun altına MCord ayarlarını açan kedi maskotunu ekler",
    authors: [Devs.MCord],
    required: true,
    dependencies: ["ServerListAPI"],
    requiresRestart: true,

    start() {
        addServerListElement("above", ELEMENT_ID, () => <WrappedMascot />, { first: true });
    },

    stop() {
        removeServerListElement("above", ELEMENT_ID);
    }
});
