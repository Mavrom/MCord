/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { definePlugin, OptionType } from "../../utils/types";

const settings = definePluginSettings({
    domains: {
        type: OptionType.BOOLEAN,
        description: "Güvenilmeyen alan adı uyarısını kaldır",
        default: true,
        restartNeeded: true
    },
    downloads: {
        type: OptionType.BOOLEAN,
        description: "Şüpheli indirme uyarısını kaldır",
        default: true,
        restartNeeded: true
    }
});

export default definePlugin({
    name: "AlwaysTrust",
    description: "Bağlantı alan adı ve şüpheli dosya indirme onay pencerelerini atlar",
    authors: [Devs.Berk],
    tags: ["bağlantı", "kullanışlılık"],
    settings,

    patches: [
        {
            find: '="MaskedLinkStore",',
            reason: "Güvenilen alan adı kararı MaskedLinkStore metodunun içinde veriliyor.",
            predicate: () => settings.store.domains,
            replacement: {
                match: /(?<=isTrustedDomain\(\i\)\{)return \i\(\i\)/,
                replace: "return true"
            }
        },
        {
            find: "bitbucket.org",
            reason: "Şüpheli dosya sınıflandırması URL ayrıştırıcı fonksiyonunun yerel dönüşünde tutuluyor.",
            predicate: () => settings.store.downloads,
            replacement: {
                match: /function \i\(\i\)\{(?=.{0,40}pathname:\i)/,
                replace: "$&return null;"
            }
        }
    ]
});
