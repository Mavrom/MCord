/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin, StartAt } from "../../utils/types";
import { byKeys } from "../../webpack/filters";
import { reportFinder, waitFor } from "../../webpack/lazy";

/** Modul kapsaminda kayit: plugin kapaliyken de CI dogruluyor. */
const HANG_STATUS = reportFinder(byKeys(["setHangStatus", "clearHangStatus"]));

/**
 * SCAFFOLD — bilinen bir istemci modundaki aynı işlevin MCord API'siyle
 * yeniden yazımı. Kullanılan webpack aramaları ve patch noktaları canlı
 * Discord'da doğrulanmalı; Discord modülü yeniden adlandırdıysa `start`
 * sessizce uyarı basar ve plugin no-op olur (güvenli mod ilkesi).
 */
export default definePlugin({
    name: "NoDefaultHangStatus",
    description: "Yeni 'takılıyor' (hang) durumunun otomatik seçilmesini engeller",
    authors: [Devs.Berk],
    tags: ["gizlilik"],
    startAt: StartAt.WebpackReady,
    requiresRestart: false,

    cancel: undefined as (() => void) | undefined,

    start() {
        // waitFor: modul yuklenene kadar bekler VE reporter'a kaydolur.
        // Eski eager findByKeys, modul o an yuklu olmadigi icin hic calismiyordu.
        this.cancel = waitFor(HANG_STATUS, (HangStatus: any) => {
            if (typeof HangStatus?.setHangStatus !== "function") return;
            this.patcher.instead(HangStatus, "setHangStatus", () => undefined);
        }, { silent: true });
    },

    stop() {
        this.cancel?.();
        this.cancel = undefined;
    }
});
