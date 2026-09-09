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

    // Kanıtlanmış açık-kaynak istemcinin (Vencord) güncel `ServerListAPI`
    // patch'lerinin birebir portu.
    patches: [
        {
            find: "#{intl::DISCODO_DISABLED}",
            reason: "Sunucu şeridinin ÜSTÜ (home/DM düğme kümesi). Vencord ServerListAPI portu.",
            replacement: {
                match: /(?<=#{intl::DISCODO_DISABLED}.+?return)(\(.{0,150}?tutorialId:"friends-list".+?}\))(?=}function)/,
                replace: "[$1].concat($self.renderAbove())"
            }
        },
        {
            find: ".setGuildsTree(",
            reason: "Sunucu şeridinin İÇİ (guild ağacı listesi). Vencord ServerListAPI portu.",
            replacement: {
                match: /(?<=#{intl::SERVERS}\),gap:"xs",children:)\i\.map\(.{0,50}\.length\)/,
                replace: "$self.renderBelow().concat($&)"
            }
        }
    ],

    renderAbove() {
        return renderServerListElements("above");
    },

    renderBelow() {
        return renderServerListElements("below");
    }
});
