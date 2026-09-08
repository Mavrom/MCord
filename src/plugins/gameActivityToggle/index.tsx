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
                width: 32,
                height: 32,
                border: 0,
                borderRadius: 4,
                background: "transparent",
                color: enabled ? "var(--interactive-normal)" : "var(--status-danger)",
                cursor: "pointer",
                fontSize: 18
            }}
        >
            {enabled ? "🎮" : "⊘"}
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
