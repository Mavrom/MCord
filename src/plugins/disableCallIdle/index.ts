/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

/**
 * Kanıtlanmış açık-kaynak istemcinin (Vencord) `DisableCallIdle` plugin'inin
 * birebir portu.
 *
 * Eski MCord sürümü `start()` içinde eager `findByKeys("getIdleTimeout", …)`
 * kullanıyordu: modül o an yüklü olmadığı için hiç çalışmıyordu ve reporter da
 * göremiyordu (eager aramalar `lazyWebpackSearchHistory`'ye kaydolmuyor).
 * Kod patch'i hem zamanlamadan bağımsız hem CI tarafından doğrulanıyor.
 */
export default definePlugin({
    name: "DisableCallIdle",
    description: "Aramada hareketsiz kalınca otomatik atılma/AFK kanalına taşınmayı engeller",
    authors: [Devs.Berk],
    tags: ["ses"],
    requiresRestart: true,

    patches: [
        {
            find: "this.idleTimeout.start(",
            reason: "DM sesli aramada 3 dk sonra atılmayı sağlayan idle zamanlayıcısı.",
            replacement: {
                match: /this\.idleTimeout\.(start|stop)/g,
                replace: "$self.noop"
            }
        },
        {
            find: "handleIdleUpdate(){",
            reason: "AFK kanalına taşıma tetikleyicisi.",
            replacement: {
                match: "handleIdleUpdate(){",
                replace: "handleIdleUpdate(){return;"
            }
        }
    ],

    noop() { /* idle zamanlayıcısını yut */ }
});
