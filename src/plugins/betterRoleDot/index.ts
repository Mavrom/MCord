/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { Logger } from "../../utils/logger";
import { definePlugin, OptionType } from "../../utils/types";

const logger = new Logger("BetterRoleDot", "#a6d189");
const settings = definePluginSettings({
    bothStyles: {
        type: OptionType.BOOLEAN,
        description: "Rol noktasıyla renkli kullanıcı adını birlikte göster",
        default: false,
        restartNeeded: true
    },
    copyColor: {
        type: OptionType.BOOLEAN,
        description: "Profildeki rol noktasına tıklayınca rengi kopyala",
        default: true,
        restartNeeded: true
    }
});

export default definePlugin({
    name: "BetterRoleDot",
    description: "Rol rengini kopyalar ve rol noktasıyla renkli adı birlikte gösterebilir",
    authors: [Devs.Berk],
    tags: ["rol", "görünüm"],
    settings,

    patches: [
        {
            find: "M0 4C0 1.79086 1.79086 0 4 0H16C18.2091",
            reason: "Rol noktası SVG'sinin tıklama davranışı bileşen fabrikasında gömülü.",
            predicate: () => settings.store.copyColor,
            replacement: {
                match: /,viewBox:"0 0 20 20"/,
                replace: "$&,onClick:()=>$self.copyColor(arguments[0].color),style:{cursor:'pointer'}"
            }
        },
        {
            find: '"dot"===',
            reason: "Discord rol noktası ile renkli adı aynı görünüm kipinde karşılıklı dışlıyor.",
            all: true,
            noWarn: true,
            predicate: () => settings.store.bothStyles,
            replacement: {
                match: /"(?:username|dot)"===\i(?!\.\i)/g,
                replace: "true"
            }
        }
    ],

    async copyColor(color: string): Promise<void> {
        if (typeof color !== "string") return;
        try {
            await navigator.clipboard.writeText(color);
        } catch (err) {
            logger.warn("Rol rengi panoya kopyalanamadı.", err);
        }
    }
});
