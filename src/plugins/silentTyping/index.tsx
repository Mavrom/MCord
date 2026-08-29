/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { definePlugin, OptionType } from "../../utils/types";
import { getFluxDispatcher } from "../../webpack/common";

const settings = definePluginSettings({
    isEnabled: {
        type: OptionType.BOOLEAN,
        description: "Yazıyor göstergesini gizle (kapatınca yalnızca yerel gösterge çalışır)",
        default: true
    },
    showLocalIndicator: {
        type: OptionType.BOOLEAN,
        description: "Kendi arayüzünde yazıyor göstergesini yine de göster",
        default: true
    }
});

export default definePlugin({
    name: "SilentTyping",
    description: "Yazıyor göstergesini karşı tarafa göndermez",
    authors: [Devs.MCord],
    tags: ["gizlilik", "mesaj"],
    settings,

    patches: [
        {
            find: '.dispatch({type:"TYPING_START_LOCAL"',
            reason:
                "`startTyping` bir nesne literali içinde tanımlı ve property adı minify sırasında "
                + "mangle ediliyor; dışarıdan erişilebilir bir fonksiyon referansı yok, bu yüzden "
                + "fonksiyon patch'i uygulanamıyor. Çapa olarak dispatch tipi kullanılıyor: "
                + "bu string minify sırasında değişmiyor.",
            replacement: {
                match: /startTyping\(\i\){.+?},stop/,
                replace: "startTyping:$self.startTyping,stop"
            }
        }
    ],

    /**
     * Orijinal `startTyping` yerine geçer.
     *
     * Orijinal fonksiyon iki iş yapıyor: `TYPING_START_LOCAL` dispatch'i ve
     * sunucuya `TYPING_START` isteği. Bizim sürümümüz **isteği hiç göndermiyor**;
     * geriye yalnızca yerel dispatch'i yapıp yapmama kararı kalıyor.
     */
    /**
     * Sohbet çubuğundaki aç/kapa düğmesi.
     *
     * Bu ayar sohbetin ortasında hızlıca değiştirilen bir şey; ayarlar menüsüne
     * gitmek pratik değil. Düğme `ChatComponentsAPI` üzerinden ekleniyor.
     */
    chatBarButton() {
        const on = settings.store.isEnabled;

        return (
            <button
                type="button"
                aria-label={on ? "Sessiz yazma açık" : "Sessiz yazma kapalı"}
                aria-pressed={on}
                title={on ? "Sessiz yazma: açık" : "Sessiz yazma: kapalı"}
                onClick={() => { settings.store.isEnabled = !on; }}
                style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "0 4px",
                    display: "flex",
                    alignItems: "center",
                    opacity: on ? 1 : 0.5
                }}
            >
                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                        fill="currentColor"
                        d="M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1m2 3v2h2V9zm4 0v2h2V9zm4 0v2h2V9zm-8 4v2h8v-2zm10 0v2h2v-2z"
                    />
                    {on && <path stroke="var(--status-danger, #ed4245)" strokeWidth="2" d="M3 21 21 3" />}
                </svg>
            </button>
        );
    },

    startTyping(channelId: string) {
        if (settings.store.isEnabled && !settings.store.showLocalIndicator) return;

        getFluxDispatcher()?.dispatch({ type: "TYPING_START_LOCAL", channelId });
    }
});
