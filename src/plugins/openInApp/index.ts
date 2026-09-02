/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { definePlugin, OptionType } from "../../utils/types";

const settings = definePluginSettings({
    spotify: { type: OptionType.BOOLEAN, description: "Spotify bağlantılarını uygulamada aç", default: true },
    steam: { type: OptionType.BOOLEAN, description: "Steam bağlantılarını uygulamada aç", default: true },
    tidal: { type: OptionType.BOOLEAN, description: "Tidal bağlantılarını uygulamada aç", default: true },
    epic: { type: OptionType.BOOLEAN, description: "Epic Games bağlantılarını uygulamada aç", default: true }
});

function nativeUrl(url: string): string | null {
    let match: RegExpMatchArray | null;
    if (settings.store.spotify && (match = url.match(/^https:\/\/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?(track|album|artist|playlist|user|episode)\/([^?]+)/)))
        return `spotify://${match[1]}/${match[2]}`;
    if (settings.store.steam && /^https:\/\/(?:store|help)\.steampowered\.com\//.test(url))
        return `steam://openurl/${url}`;
    if (settings.store.steam && /^https:\/\/steamcommunity\.com\//.test(url))
        return `steam://openurl/${url}`;
    if (settings.store.tidal && (match = url.match(/^https:\/\/(?:listen\.)?tidal\.com\/(?:browse\/)?(track|album|artist|playlist|video|mix)\/([a-zA-Z0-9-]+)/)))
        return `tidal://${match[1]}/${match[2]}`;
    if (settings.store.epic && (match = url.match(/^https:\/\/store\.epicgames\.com\/(.+)$/)))
        return `com.epicgames.launcher://store/${match[1]}`;
    return null;
}

export default definePlugin({
    name: "OpenInApp",
    description: "Desteklenen müzik ve mağaza bağlantılarını ilgili Windows uygulamasında açar",
    authors: [Devs.Berk],
    tags: ["bağlantı", "windows"],
    settings,

    patches: [{
        find: "trackAnnouncementMessageLinkClicked({",
        reason: "Discord bağlantı tıklamasını dışarı açmadan hemen önce yerel URL işleyicisini çağırıyor.",
        replacement: {
            match: /function (\i\(\i,\i\)\{)(?=.{0,150}trusted:)/,
            replace: "function $1if($self.handleLink(...arguments))return;"
        }
    }],

    handleLink(data: { href?: string }, event?: MouseEvent): boolean {
        if (typeof data?.href !== "string") return false;
        const target = nativeUrl(data.href);
        if (!target) return false;
        event?.preventDefault?.();
        window.open(target, "_self");
        return true;
    }
});
