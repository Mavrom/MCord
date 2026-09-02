/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import type { MessageObject } from "../../api/messageEvents";
import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { definePlugin, OptionType } from "../../utils/types";

const SILENT_PREFIX = "@silent ";

const settings = definePluginSettings({
    autoDisable: {
        type: OptionType.BOOLEAN,
        description: "Sessiz mesaj gönderildikten sonra düğmeyi otomatik kapat",
        default: true
    },
    persistState: {
        type: OptionType.BOOLEAN,
        description: "Aç/kapa durumunu yeniden başlatmalar arasında hatırla",
        default: false
    },
    // UI'da gizli — durum sohbet çubuğundaki düğmeyle değişir.
    active: {
        type: OptionType.BOOLEAN,
        description: "Sonraki mesaj sessiz gönderilsin",
        default: false,
        hidden: true
    }
});

/** Oturum içi geçici durum (persistState kapalıyken kullanılır). */
let sessionActive = false;

function isActive(): boolean {
    return settings.store.persistState ? settings.store.active : sessionActive;
}

function setActive(value: boolean): void {
    if (settings.store.persistState) settings.store.active = value;
    else sessionActive = value;
}

export default definePlugin({
    name: "SilentMessage",
    description: "Mesajı bildirim göndermeden (@silent) yollamak için sohbet çubuğuna düğme ekler",
    authors: [Devs.Berk],
    tags: ["mesaj", "gizlilik"],
    settings,
    dependencies: ["MessageEventsAPI", "ChatComponentsAPI"],
    requiresRestart: false,

    onBeforeMessageSend(_channelId: string, message: MessageObject) {
        if (!isActive()) return;

        if (message.content && !message.content.startsWith(SILENT_PREFIX) && message.content !== "@silent") {
            message.content = SILENT_PREFIX + message.content;
        }

        if (settings.store.autoDisable) setActive(false);
    },

    chatBarButton() {
        const on = isActive();

        return (
            <button
                type="button"
                aria-label={on ? "Sessiz mesaj açık" : "Sessiz mesaj kapalı"}
                aria-pressed={on}
                title={on ? "Sessiz mesaj: açık — sonraki mesaj bildirim göndermez" : "Sessiz mesaj: kapalı"}
                onClick={() => { setActive(!on); }}
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
                        d="M12 3a5 5 0 0 0-5 5v3.6c0 .5-.2 1-.6 1.4L5 17h14l-1.4-4a2 2 0 0 1-.6-1.4V8a5 5 0 0 0-5-5m0 18a3 3 0 0 0 3-3H9a3 3 0 0 0 3 3"
                    />
                    {on && <path stroke="var(--status-danger, #ed4245)" strokeWidth="2" strokeLinecap="round" d="M3 21 21 3" />}
                </svg>
            </button>
        );
    }
});
