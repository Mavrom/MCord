/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { definePlugin, OptionType } from "../../utils/types";

const settings = definePluginSettings({
    shownEmojis: {
        type: OptionType.SELECT,
        description: "Otomatik tamamlamada gösterilecek emoji türleri",
        options: [
            { label: "Yalnızca Unicode", value: "unicode", default: true },
            { label: "Unicode ve mevcut sunucu", value: "current" },
            { label: "Tüm emojiler", value: "all" }
        ]
    }
});

export default definePlugin({
    name: "NoServerEmojis",
    description: "Emoji otomatik tamamlamasında diğer sunucuların emojilerini gizler",
    authors: [Devs.Berk],
    tags: ["emoji", "sunucu"],
    settings,

    patches: [{
        find: "}searchWithoutFetchingLatest(",
        reason: "Emoji adayları yalnızca otomatik tamamlama araması oluşturulurken filtrelenebilir.",
        replacement: {
            match: /\.nameMatchesChain\(\i\)\.reduce\(\((\i),(\i)\)=>\{(?<=channel:(\i).+?)/,
            replace: "$&if($self.shouldSkipEmoji($3,$2))return $1;"
        }
    }],

    shouldSkipEmoji(channel: any, emoji: any): boolean {
        if (emoji?.type !== 1 || settings.store.shownEmojis === "all") return false;
        if (settings.store.shownEmojis === "unicode") return true;

        const currentGuildId = channel?.getGuildId?.() ?? channel?.guild_id ?? null;
        return emoji.guildId !== currentGuildId;
    }
});
