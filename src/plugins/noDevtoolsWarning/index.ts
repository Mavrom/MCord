/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin, StartAt } from "../../utils/types";

/**
 * Konsoldaki büyük kırmızı "Dur!" (self-XSS) uyarısını susturur.
 * Discord bu uyarıyı `console` metodlarını süsleyerek basıyor; biz de
 * kurulur kurulmaz orijinal referansları geri yüklüyoruz.
 */
export default definePlugin({
    name: "NoDevtoolsWarning",
    description: "Geliştirici konsolundaki 'Dur!' self-XSS uyarısını kaldırır",
    authors: [Devs.Berk],
    tags: ["gelistirici"],
    startAt: StartAt.Init,
    requiresRestart: false,

    start() {
        try {
            const iframe = document.createElement("iframe");
            iframe.style.display = "none";
            document.body.appendChild(iframe);
            const clean = (iframe.contentWindow as any)?.console;
            if (clean) {
                for (const m of ["log", "warn", "error", "info", "debug"] as const) {
                    if (typeof clean[m] === "function") (console as any)[m] = clean[m].bind(clean);
                }
            }
            iframe.remove();
        } catch { /* iframe engelli */ }
    }
});
