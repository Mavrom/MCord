/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Logger } from "../../../utils/logger";
import { ContextMenuApi, getFluxDispatcher, transitionTo } from "../../../webpack/common";
import { byKeys } from "../../../webpack/filters";
import { find } from "../../../webpack/finder";

const logger = new Logger("Recovery", "#e78284");

interface RecoveryStep {
    action(): void;
    errorMessage: string;
}

/**
 * Kurtarma adımları (plan §8.3).
 *
 * Mantık: hata genellikle bir overlay/modal/kanal render'ında oluşuyor. Tüm
 * katmanları kapat, güvenli bir rotaya (DM listesi) git, modal'ları temizle.
 * **Her adım kendi try/catch'inde** — biri patlarsa diğerleri çalışır.
 */
export function buildRecoverySteps(): RecoveryStep[] {
    const Dispatcher = getFluxDispatcher();
    const ModalActions = find(byKeys(["closeAllModals", "openModal"]), { silent: true });

    return [
        {
            action: () => Dispatcher?.dispatch({ type: "LAYER_POP_ALL" }),
            errorMessage: "Katmanlar kapatılamadı."
        },
        {
            action: () => Dispatcher?.dispatch({ type: "MODAL_POP_ALL" }),
            errorMessage: "Modal'lar kapatılamadı."
        },
        {
            action: () => {
                Dispatcher?.dispatch({ type: "CONTEXT_MENU_CLOSE" });
                ContextMenuApi?.closeContextMenu?.();
            },
            errorMessage: "Bağlam menüsü kapatılamadı."
        },
        {
            action: () => (typeof transitionTo === "function" ? transitionTo("/channels/@me") : undefined),
            errorMessage: "Güvenli rotaya geçilemedi."
        },
        {
            action: () => ModalActions?.closeAllModals?.(),
            errorMessage: "closeAllModals çağrılamadı."
        }
    ];
}

/** Tüm adımları çalıştırır; hepsi başarılıysa `true` döner. */
export function attemptRecovery(): boolean {
    let allSucceeded = true;

    for (const step of buildRecoverySteps()) {
        try {
            step.action();
        } catch (err) {
            allSucceeded = false;
            logger.warn(`${step.errorMessage}\n`, err);
        }
    }

    return allSucceeded;
}
