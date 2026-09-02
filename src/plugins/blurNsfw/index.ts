/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { definePlugin, OptionType } from "../../utils/types";

const settings = definePluginSettings({
    amount: {
        type: OptionType.NUMBER,
        description: "Bulanıklık miktarı (piksel)",
        default: 10,
        onChange: value => document.documentElement.style.setProperty("--mcord-nsfw-blur", `${value}px`)
    }
});

const style = `
.mcord-nsfw-image [class*="imageContainer_"],
.mcord-nsfw-image [class*="wrapperPaused_"] {
    filter: blur(var(--mcord-nsfw-blur, 10px));
    transition: filter 0.2s ease;
}
.mcord-nsfw-image [class*="imageContainer_"]:hover,
.mcord-nsfw-image [class*="wrapperPaused_"]:hover {
    filter: blur(0);
}
`;

export default definePlugin({
    name: "BlurNSFW",
    description: "NSFW kanallarındaki görsel eklerini üzerine gelene kadar bulanıklaştırır",
    authors: [Devs.Berk],
    tags: ["gizlilik", "görünüm"],
    settings,
    managedStyle: style,

    patches: [{
        find: "}renderStickersAccessories(",
        reason: "Mesaj kök className'i kanalın NSFW bilgisinin bulunduğu render metodunda oluşturuluyor.",
        replacement: {
            match: /(\.renderReactions\(\i\).+?className:)/,
            replace: '$&(this?.props?.channel?.nsfw?"mcord-nsfw-image ":"")+'
        }
    }],

    start() {
        document.documentElement.style.setProperty("--mcord-nsfw-blur", `${settings.store.amount}px`);
    },

    stop() {
        document.documentElement.style.removeProperty("--mcord-nsfw-blur");
    }
});
