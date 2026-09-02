/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { Logger } from "../../utils/logger";
import { definePlugin, OptionType } from "../../utils/types";

const logger = new Logger("LoadingQuotes", "#a6d189");
const MCORD_QUOTES = [
    "MCord hazırlanıyor…",
    "Kanallar sıralanıyor…",
    "Emojiler cilalanıyor…",
    "Mesajlar güvende tutuluyor…",
    "Birazdan buradayız…",
    "Discord modülleri uyandırılıyor…",
    "Kısayollar yerlerine konuyor…",
    "Son kontroller yapılıyor…"
];

const settings = definePluginSettings({
    keepDiscordQuotes: {
        type: OptionType.BOOLEAN,
        description: "Discord'un kendi yükleme sözlerini de koru",
        default: false
    },
    replaceEventQuotes: {
        type: OptionType.BOOLEAN,
        description: "Etkinlik dönemlerindeki özel sözleri de değiştir",
        default: true
    },
    additionalQuotes: {
        type: OptionType.STRING,
        description: "Ayraçla ayrılmış ek yükleme sözleri",
        default: ""
    },
    delimiter: {
        type: OptionType.STRING,
        description: "Ek sözlerin ayracı",
        default: "|"
    }
});

export default definePlugin({
    name: "LoadingQuotes",
    description: "Discord yükleme ekranına MCord ve kişisel sözler ekler",
    authors: [Devs.Berk],
    tags: ["görünüm", "eğlence"],
    settings,

    patches: [{
        find: "#{intl::LOADING_DID_YOU_KNOW}",
        reason: "Yükleme sözü dizileri, yükleme ekranı fabrikasının yerel değişkenlerinde tutuluyor.",
        replacement: [
            {
                match: /_loadingText.+?(?=(\i)\[.{0,12}\.random)/,
                replace: "$&$self.prepareQuotes($1),"
            },
            {
                match: /_eventLoadingText.+?(?=(\i)\[.{0,12}\.random)/,
                replace: "$&$self.prepareQuotes($1),",
                predicate: () => settings.store.replaceEventQuotes
            }
        ]
    }],

    prepareQuotes(quotes: string[]): void {
        try {
            if (!settings.store.keepDiscordQuotes) quotes.length = 0;

            for (const quote of MCORD_QUOTES) {
                if (!quotes.includes(quote)) quotes.push(quote);
            }

            const delimiter = settings.store.delimiter || "|";
            for (const quote of settings.store.additionalQuotes.split(delimiter)) {
                const trimmed = quote.trim();
                if (trimmed && !quotes.includes(trimmed)) quotes.push(trimmed);
            }
        } catch (err) {
            logger.warn("Yükleme sözleri güncellenemedi; Discord listesi korunuyor.", err);
        }
    }
});
