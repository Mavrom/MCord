/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { getProfileBadges } from "../../../api/badges";
import { Devs } from "../../../utils/constants";
import { definePlugin } from "../../../utils/types";

export default definePlugin({
    name: "BadgesAPI",
    description: "Plugin'lerin kullanıcı profiline özel rozet eklemesini sağlar",
    authors: [Devs.MCord],
    required: true,

    // Kanıtlanmış açık-kaynak istemcinin (Vencord) `getLegacyUsername(){`
    // patch'inin birebir portu. (Vencord'un `#{intl::PROFILE_USER_BADGES}`
    // bileşen-rozet grubu MCord'da yok — MCord yalnız resim-URL'li rozet
    // destekliyor; component rozet desteği eklenince o patch de portlanacak.)
    patches: [
        {
            find: "getLegacyUsername(){",
            reason: "getBadges() dönüşüne MCord rozetlerini ekle. Vencord BadgesAPI portu.",
            replacement: {
                match: /getBadges\(\)\{.{0,100}?return\[/,
                replace: "$&...$self.getBadges(this),"
            }
        }
    ],

    getBadges(profile: { userId?: string }) {
        return getProfileBadges(profile);
    }
});
