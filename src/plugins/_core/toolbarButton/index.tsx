/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/**
 * Discord'un üst bar toolbar'ına (inbox / yardım ikonlarının yanı) bir **MC**
 * butonu koyar → tıkla → MCord ayarları açılır.
 *
 * Kod patch'i değil **DOM enjeksiyonu**: Discord'un toolbar bileşenini webpack'ten
 * bulup patch'lemek sürüm kırılgan; bunun yerine toolbar elementini seçip
 * butonu ekliyoruz, `MutationObserver` ile yeniden render'larda geri koyuyoruz.
 */

import { Devs } from "../../../utils/constants";
import { Logger } from "../../../utils/logger";
import { definePlugin, StartAt } from "../../../utils/types";
import { toggleSettings } from "../settings";

const logger = new Logger("ToolbarButton", "#c9a0f0");

const BUTTON_ID = "mcord-toolbar-button";

/** Discord toolbar'ı için aday seçiciler — ilki tutan kullanılır. */
const TOOLBAR_SELECTORS = [
    '[class*="toolbar_"]',
    '[class*="toolbar-"]',
    'section[aria-label] [class*="toolbar"]'
];

function findToolbar(): Element | null {
    for (const selector of TOOLBAR_SELECTORS) {
        const candidates = document.querySelectorAll(selector);
        for (const el of candidates) {
            // İçinde en az bir buton/ikon barındıran görünür bir toolbar seç.
            if (el.querySelector("button, [role='button']") && (el as HTMLElement).offsetParent !== null) {
                return el;
            }
        }
    }
    return null;
}

function makeButton(): HTMLButtonElement {
    const button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    button.textContent = "MC";
    button.title = "MCord ayarları (Ctrl+Alt+M)";
    button.setAttribute("aria-label", "MCord ayarları");
    button.style.cssText = [
        "background:none",
        "border:0",
        "cursor:pointer",
        "font:700 13px var(--font-primary, sans-serif)",
        "color:var(--interactive-normal, #b5bac1)",
        "padding:0 8px",
        "height:24px",
        "display:flex",
        "align-items:center",
        "border-radius:4px"
    ].join(";");

    button.addEventListener("mouseenter", () => {
        button.style.color = "var(--interactive-hover, #dbdee1)";
    });
    button.addEventListener("mouseleave", () => {
        button.style.color = "var(--interactive-normal, #b5bac1)";
    });
    button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        logger.info("MC butonuna tıklandı → ayarlar açılıyor");
        try {
            toggleSettings();
        } catch (err) {
            logger.error("toggleSettings patladı:", err);
        }
    });

    return button;
}

let observer: MutationObserver | null = null;
let warned = false;
let scheduled = false;

/** Büyük re-render'larda `inject`'i dakikada bir değil, kare başına bir kez çağır. */
function scheduleInject(): void {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
        scheduled = false;
        inject();
    });
}

function inject(): void {
    if (document.getElementById(BUTTON_ID)) return;

    const toolbar = findToolbar();
    if (!toolbar) {
        if (!warned) {
            logger.warn("Toolbar bulunamadı — MC butonu eklenemedi (Ctrl+Alt+M çalışıyor).");
            warned = true;
        }
        return;
    }

    toolbar.prepend(makeButton());
    if (warned) logger.info("Toolbar bulundu, MC butonu eklendi.");
    warned = false;
}

export default definePlugin({
    name: "ToolbarButton",
    description: "Discord toolbar'ına MCord ayarlarını açan MC butonu ekler",
    authors: [Devs.MCord],
    required: true,
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
