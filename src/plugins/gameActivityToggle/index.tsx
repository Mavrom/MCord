/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { getUserSettingLazy } from "../../api/userSettings";
import { Devs } from "../../utils/constants";
import { Logger } from "../../utils/logger";
import { definePlugin, StartAt } from "../../utils/types";

/**
 * Mikrofon/kulaklık düğmelerinin yanına "oyun etkinliğini aç/kapat" düğmesi.
 *
 * Kod patch'i DEĞİL **DOM enjeksiyonu**: Discord bu paneli sık yeniden
 * yapılandırıyor (bu build'de `accountContainerRef` çapası tamamen kalktı),
 * kod patch'i kırılgan. MC toolbar butonuyla aynı desen — elementi seç,
 * düğmeyi ekle, `MutationObserver` ile geri koy.
 */

const logger = new Logger("GameActivityToggle", "#f4b8e4");
const showCurrentGame = getUserSettingLazy<boolean>("status", "showCurrentGame");

const BUTTON_ID = "mcord-game-activity-toggle";

/** Alt-sol paneldeki mikrofon/kulaklık düğmelerini barındıran satır. */
const PANEL_BUTTON_SELECTORS = [
    'section[class*="panels_"] [class*="buttons_"]',
    '[class*="panels_"] [class*="buttons_"]',
    'section[class*="panel_"] [class*="buttons_"]',
    '[class*="panelSubtextContainer_"] ~ [class*="buttons_"]'
];

function findButtonRow(): HTMLElement | null {
    for (const selector of PANEL_BUTTON_SELECTORS) {
        for (const el of document.querySelectorAll<HTMLElement>(selector)) {
            if (el.querySelector("button") && el.offsetParent !== null) return el;
        }
    }
    return null;
}

function isEnabled(): boolean {
    try {
        return showCurrentGame.getSetting?.() ?? true;
    } catch {
        return true;
    }
}

const ICON_ON =
    '<svg width="20" height="20" viewBox="0 0 24 24">'
    + '<path fill="currentColor" d="M3.06 20.4q-1.53 0-2.37-1.065T.06 16.74l1.26-9q.27-1.8 1.605-2.97T6.06 3.6h11.88q1.8 0 3.135 1.17t1.605 2.97l1.26 9q.21 1.53-.63 2.595T20.94 20.4q-.63 0-1.17-.225T18.78 19.5l-2.7-2.7H7.92l-2.7 2.7q-.45.45-.99.675t-1.17.225Zm14.94-7.2q.51 0 .855-.345T19.2 12q0-.51-.345-.855T18 10.8q-.51 0-.855.345T16.8 12q0 .51.345.855T18 13.2Zm-2.4-3.6q.51 0 .855-.345T16.8 8.4q0-.51-.345-.855T15.6 7.2q-.51 0-.855.345T14.4 8.4q0 .51.345.855T15.6 9.6ZM6.9 13.2h1.8v-2.1h2.1v-1.8h-2.1v-2.1h-1.8v2.1h-2.1v1.8h2.1v2.1Z"/>'
    + "</svg>";

const ICON_OFF =
    '<svg width="20" height="20" viewBox="0 0 24 24">'
    + '<mask id="mcord-gat-off"><rect fill="white" x="0" y="0" width="24" height="24"/>'
    + '<path fill="black" d="M23.27 4.73 19.27 .73 -.27 20.27 3.73 24.27Z"/></mask>'
    + '<path fill="var(--status-danger)" mask="url(#mcord-gat-off)" d="M3.06 20.4q-1.53 0-2.37-1.065T.06 16.74l1.26-9q.27-1.8 1.605-2.97T6.06 3.6h11.88q1.8 0 3.135 1.17t1.605 2.97l1.26 9q.21 1.53-.63 2.595T20.94 20.4q-.63 0-1.17-.225T18.78 19.5l-2.7-2.7H7.92l-2.7 2.7q-.45.45-.99.675t-1.17.225Zm14.94-7.2q.51 0 .855-.345T19.2 12q0-.51-.345-.855T18 10.8q-.51 0-.855.345T16.8 12q0 .51.345.855T18 13.2Zm-2.4-3.6q.51 0 .855-.345T16.8 8.4q0-.51-.345-.855T15.6 7.2q-.51 0-.855.345T14.4 8.4q0 .51.345.855T15.6 9.6ZM6.9 13.2h1.8v-2.1h2.1v-1.8h-2.1v-2.1h-1.8v2.1h-2.1v1.8h2.1v2.1Z"/>'
    + '<path fill="var(--status-danger)" d="M22.7 2.7a1 1 0 0 0-1.4-1.4l-20 20a1 1 0 1 0 1.4 1.4Z"/>'
    + "</svg>";

function paint(button: HTMLButtonElement): void {
    const on = isEnabled();
    button.innerHTML = on ? ICON_ON : ICON_OFF;
    button.title = on ? "Oyun etkinliğini gizle" : "Oyun etkinliğini göster";
    button.setAttribute("aria-label", button.title);
    button.setAttribute("aria-pressed", String(!on));
}

function makeButton(): HTMLButtonElement {
    const button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    button.style.cssText = [
        "display:flex", "align-items:center", "justify-content:center",
        "width:32px", "height:32px", "padding:0", "border:0", "border-radius:8px",
        "background:transparent", "color:var(--interactive-normal,#b5bac1)", "cursor:pointer"
    ].join(";");

    button.addEventListener("mouseenter", () => {
        button.style.background = "var(--background-modifier-selected, rgba(255,255,255,.08))";
        button.style.color = "var(--interactive-hover, #dbdee1)";
    });
    button.addEventListener("mouseleave", () => {
        button.style.background = "transparent";
        button.style.color = "var(--interactive-normal, #b5bac1)";
    });

    button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        try {
            if (typeof showCurrentGame.updateSetting !== "function") {
                logger.warn("Discord oyun-etkinliği ayarı bulunamadı (UserSettingsAPI patch'i kırık olabilir).");
                return;
            }
            void Promise.resolve(showCurrentGame.updateSetting(!isEnabled()))
                .then(() => setTimeout(() => paint(button), 120))
                .catch(err => logger.warn("Ayar güncellenemedi:", err));
        } catch (err) {
            logger.error("Tıklama işlenemedi:", err);
        }
    });

    paint(button);
    return button;
}

let observer: MutationObserver | null = null;
let scheduled = false;
let warned = false;

function inject(): void {
    const existing = document.getElementById(BUTTON_ID) as HTMLButtonElement | null;
    if (existing) {
        // Discord aynı satırı yeniden çizmediyse sadece durumu tazele.
        if (existing.isConnected) paint(existing);
        return;
    }

    const row = findButtonRow();
    if (!row) {
        if (!warned) {
            logger.warn("Panel düğme satırı bulunamadı — oyun etkinliği düğmesi eklenemedi.");
            warned = true;
        }
        return;
    }

    row.appendChild(makeButton());
    if (warned) logger.info("Panel bulundu, oyun etkinliği düğmesi eklendi.");
    warned = false;
}

function scheduleInject(): void {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
        scheduled = false;
        inject();
    });
}

export default definePlugin({
    name: "GameActivityToggle",
    description: "Mikrofon ve kulaklık düğmelerinin yanına oyun etkinliği paylaşımını açıp kapatan bir düğme ekler",
    authors: [Devs.Berk],
    tags: ["aktivite", "kısayol"],
    dependencies: ["UserSettingsAPI"],
    startAt: StartAt.DOMContentLoaded,

    start() {
        inject();
        observer = new MutationObserver(scheduleInject);
        observer.observe(document.body, { childList: true, subtree: true });
    },

    stop() {
        observer?.disconnect();
        observer = null;
        document.getElementById(BUTTON_ID)?.remove();
    }
});
