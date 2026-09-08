/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { getUserSettingLazy } from "../../api/userSettings";
import { Devs } from "../../utils/constants";
import { Logger } from "../../utils/logger";
import { definePlugin } from "../../utils/types";

const logger = new Logger("GameActivityToggle", "#f4b8e4");
const showCurrentGame = getUserSettingLazy<boolean>("status", "showCurrentGame");

/** referans katalog güncel oyun-etkinliği simgesi (kol + kapalıyken kırmızı çizgi). */
function Icon({ enabled }: { enabled: boolean }) {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path
                fill={enabled ? "currentColor" : "var(--status-danger)"}
                mask={enabled ? undefined : "url(#mcord-gat-off)"}
                d="M3.06 20.4q-1.53 0-2.37-1.065T.06 16.74l1.26-9q.27-1.8 1.605-2.97T6.06 3.6h11.88q1.8 0 3.135 1.17t1.605 2.97l1.26 9q.21 1.53-.63 2.595T20.94 20.4q-.63 0-1.17-.225T18.78 19.5l-2.7-2.7H7.92l-2.7 2.7q-.45.45-.99.675t-1.17.225Zm14.94-7.2q.51 0 .855-.345T19.2 12q0-.51-.345-.855T18 10.8q-.51 0-.855.345T16.8 12q0 .51.345 .855T18 13.2Zm-2.4-3.6q.51 0 .855-.345T16.8 8.4q0-.51-.345-.855T15.6 7.2q-.51 0-.855.345T14.4 8.4q0 .51.345 .855T15.6 9.6ZM6.9 13.2h1.8v-2.1h2.1v-1.8h-2.1v-2.1h-1.8v2.1h-2.1v1.8h2.1v2.1Z"
            />
            {!enabled && (
                <>
                    <path fill="var(--status-danger)" d="M22.7 2.7a1 1 0 0 0-1.4-1.4l-20 20a1 1 0 1 0 1.4 1.4Z" />
                    <mask id="mcord-gat-off">
                        <rect fill="white" x="0" y="0" width="24" height="24" />
                        <path fill="black" d="M23.27 4.73 19.27 .73 -.27 20.27 3.73 24.27Z" />
                    </mask>
                </>
            )}
        </svg>
    );
}

function ToggleButton() {
    const enabled = showCurrentGame.useSetting?.() ?? showCurrentGame.getSetting?.() ?? false;

    return (
        <button
            type="button"
            title={enabled ? "Oyun etkinliğini gizle" : "Oyun etkinliğini göster"}
            aria-label={enabled ? "Oyun etkinliğini gizle" : "Oyun etkinliğini göster"}
            aria-pressed={enabled}
            onClick={() => {
                if (typeof showCurrentGame.updateSetting !== "function") {
                    logger.warn("Discord oyun etkinliği ayarı bulunamadı.");
                    return;
                }
                void showCurrentGame.updateSetting(!enabled);
            }}
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                border: 0,
                borderRadius: 4,
                background: "transparent",
                color: "var(--interactive-normal)",
                cursor: "pointer"
            }}
        >
            <Icon enabled={enabled} />
        </button>
    );
}

export default definePlugin({
    name: "GameActivityToggle",
    description: "Mikrofon ve kulaklık düğmelerinin yanından oyun etkinliği paylaşımını açıp kapatır",
    authors: [Devs.Berk],
    tags: ["aktivite", "kısayol"],
    dependencies: ["UserSettingsAPI"],

    patches: [{
        find: "#{intl::USER_PROFILE_ACCOUNT_POPOUT_BUTTON_A11Y_LABEL}",
        reason: "Discord hesap paneli ek düğmeler için resmi bir yerleşim kancası sunmuyor.",
        replacement: {
            match: /children:\[(?=.{0,40}?accountContainerRef)/,
            replace: "children:[$self.renderToggle(),"
        }
    }],

    renderToggle() {
        return <ToggleButton />;
    }
});
