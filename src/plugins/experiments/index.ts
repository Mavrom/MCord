/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "Experiments",
    description: "Discord'un deney ve geliştirici ayar sayfalarına erişimi açar",
    authors: [Devs.Berk],
    tags: ["geliştirici", "deneysel"],

    patches: [
        {
            find: "Object.defineProperties(this,{isDeveloper",
            reason: "Geliştirici görünürlüğü Discord'un deney store'u kurucusundaki salt getter ile kapatılıyor.",
            replacement: {
                match: /(?<={isDeveloper:\{[^}]+?,get:\(\)=>)\i/,
                replace: "true"
            }
        },
        {
            find: 'type:"user",revision',
            reason: "Kullanıcı deneylerinin CONNECTION_OPEN sırasında yüklenmesi yerel kapı değişkeniyle engelleniyor.",
            replacement: {
                match: /!(\i)(?=&&"CONNECTION_OPEN")/,
                replace: "!($1=true)"
            }
        }
    ]
});
