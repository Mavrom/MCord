/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

function pauseOnF8(event: KeyboardEvent): void {
    if (event.code !== "F8") return;
    // DevTools açıkken istemciyi durdurur; tekrar F8 yürütmeyi sürdürür.
    debugger;
}

export default definePlugin({
    name: "F8Break",
    description: "Geliştirici araçları açıkken F8 ile istemci yürütmesini duraklatır",
    authors: [Devs.Berk],
    tags: ["geliştirici", "kısayol"],
    requiresRestart: false,

    start() {
        window.addEventListener("keydown", pauseOnF8);
    },

    stop() {
        window.removeEventListener("keydown", pauseOnF8);
    }
});
