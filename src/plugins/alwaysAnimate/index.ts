/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "AlwaysAnimate",
    description: "Animasyon destekleyen avatar, emoji, rol ve profil öğelerini sürekli oynatır",
    authors: [Devs.Berk],
    tags: ["animasyon", "görünüm"],

    patches: [
        {
            find: "canAnimate:",
            reason: "Animasyon izni farklı React bileşenlerinin props nesnelerinde yerel olarak hesaplanıyor.",
            all: true,
            noWarn: true,
            replacement: {
                match: /canAnimate:.+?([,}].*?\))/g,
                replace: (matched, suffix) => suffix.includes("}=") ? matched : `canAnimate:!0${suffix}`
            }
        },
        {
            find: "#{intl::GUILD_OWNER}),children:",
            reason: "Özel durum emojisinin animasyon bayrağı kullanıcı dekoratörü fabrikasında gömülü.",
            replacement: {
                match: /(\.CUSTOM_STATUS.+?animateEmoji:)\i/,
                replace: "$1!0"
            }
        },
        {
            find: "#{intl::DISCOVERABLE_GUILD_HEADER_PUBLIC_INFO}",
            reason: "Sunucu afişinin animasyon bayrağı afiş bileşeninde yerel değişken.",
            replacement: {
                match: /(guildBanner:\i,animate:)\i(?=}\):null)/,
                replace: "$1!0"
            }
        }
    ]
});
