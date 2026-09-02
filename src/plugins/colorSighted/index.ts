/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "ColorSighted",
    description: "Durum simgelerindeki renk körlüğü şekillerini kaldırıp yalnızca renkleri kullanır",
    authors: [Devs.Berk],
    tags: ["görünüm", "durum"],

    patches: [
        {
            find: "Masks.STATUS_ONLINE",
            reason: "Durum şekilleri maske sabitleri olarak avatar fabrikasında seçiliyor.",
            replacement: {
                match: /Masks\.STATUS_(?:IDLE|DND|STREAMING|OFFLINE)/g,
                replace: "Masks.STATUS_ONLINE"
            }
        },
        {
            find: ".AVATAR_STATUS_MOBILE_16;",
            reason: "Mobil durum şekli durum props'u hazırlanırken ayrı seçiliyor.",
            replacement: {
                match: /(fromIsMobile:\i=!0,.+?)status:(\i)/,
                replace: '$1status_mcord:$2="online"'
            }
        }
    ]
});
