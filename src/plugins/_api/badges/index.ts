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

    patches: [
        {
            find: "getLegacyUsername(){",
            reason:
                "Discord'un profil sınıfı `getBadges()` metodunda rozet dizisini "
                + "`this._userProfile.badges` üzerinden kuruyor. Metot bir sınıf gövdesi "
                + "içinde; dışarıdan tutulabilir referansı yok, fonksiyon patch'i "
                + "uygulanamıyor. Çapa `getLegacyUsername(){` — aynı sınıfta, bundle'da "
                + "tek geçiyor.",
            replacement: {
                // `getBadges(){…return[` kalıbının hemen ardına kendi rozetlerimizi
                // yayıyoruz (dizi başına). `[^}]{0,80}?` ile `return`'den önce
                // olası bir ifadeye de izin veriyoruz.
                match: /getBadges\(\)\{[^}]{0,80}?return\[/,
                replace: "$&...$self.getBadges(this),"
            }
        }
    ],

    getBadges(profile: { userId?: string }) {
        return getProfileBadges(profile);
    }
});
