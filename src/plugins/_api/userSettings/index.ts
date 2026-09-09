/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../../utils/constants";
import { definePlugin } from "../../../utils/types";

export default definePlugin({
    name: "UserSettingsAPI",
    description: "Plugin'lerin Discord'un kendi ayarlarını okuyup değiştirmesini sağlar",
    authors: [Devs.MCord],

    /**
     * `ChatComponentsAPI`'nin aksine her zaman açık değil: sadece kullanan
     * plugin'ler bunu `dependencies` alanında bildiriyor, `PluginManager`
     * o zaman otomatik etkinleştiriyor (plan §6.3). Discord'un ayar
     * tarama modülünü gereksiz yere patch'lememek için varsayılan kapalı.
     */
    // Kanıtlanmış açık-kaynak istemcinin (Vencord) güncel `UserSettingsAPI`
    // patch'lerinin birebir portu: her ayar tanımına hangi grup/isimden
    // geldiğini (`userSettingsAPIGroup`/`userSettingsAPIName`) yazıyor.
    patches: [
        {
            find: ",updateSetting:",
            reason: "Ayar tanımlarına grup/isim bilgisini ekle. Vencord UserSettingsAPI portu.",
            replacement: [
                {
                    match: /\.updateAsync\(.+?(?=,useSetting:)/,
                    replace: "$&,userSettingsAPIGroup:arguments[0],userSettingsAPIName:arguments[1]"
                },
                {
                    match: /updateSetting:.{0,100}SELECTIVELY_SYNCED_USER_SETTINGS_UPDATE/,
                    replace: "userSettingsAPIGroup:arguments[0].userSettingsAPIGroup,userSettingsAPIName:arguments[0].userSettingsAPIName,$&"
                },
                {
                    match: /updateSetting:.{0,60}USER_SETTINGS_OVERRIDE_CLEAR/,
                    replace: "userSettingsAPIGroup:arguments[0].userSettingsAPIGroup,userSettingsAPIName:arguments[0].userSettingsAPIName,$&"
                }
            ]
        }
    ]
});
