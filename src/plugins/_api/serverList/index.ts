/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { renderServerListElements } from "../../../api/serverList";
import { Devs } from "../../../utils/constants";
import { definePlugin } from "../../../utils/types";

export default definePlugin({
    name: "ServerListAPI",
    description: "Plugin'lerin sol sunucu şeridinin üstüne/altına eleman eklemesini sağlar",
    authors: [Devs.MCord],
    required: true,

    patches: [
        {
            find: '"guildsnav"',
            reason:
                "Sunucu şeridi (`<nav aria-label=…>`) kaydırılabilir listeyi bir modül "
                + "literali içinde inline JSX children dizisi olarak kuruyor. Dizi "
                + "elemanlarının dışarıdan tutulabilir referansı yok, fonksiyon patch'i "
                + "uygulanamıyor. Çapa `\"guildsnav\"` navigasyon kimliği — bundle'da tek "
                + "geçiyor.",
            replacement: [
                {
                    // ÜST: home/DM düğme kümesinden (`{scrollToTop,lurkingGuildIds}`)
                    // hemen sonra, guild ağacından önce.
                    match: /(\(0,\i\.jsx\)\(\i,\{scrollToTop:\i,lurkingGuildIds:\i\}\),)/,
                    replace: "$1...$self.renderAbove(),"
                },
                {
                    // ALT: guild keşif düğmesini taşıyan eleman (`{guildDiscoveryButton:…}`)
                    // kaydırıcının son çocuğu — ondan hemen sonra.
                    match: /((\(0,\i\.jsx\)\(\i,\{guildDiscoveryButton:\i,[^}]*\}\)))(\]\}\))/,
                    replace: "$1,...$self.renderBelow()$3"
                }
            ]
        }
    ],

    renderAbove() {
        return renderServerListElements("above");
    },

    renderBelow() {
        return renderServerListElements("below");
    }
});
