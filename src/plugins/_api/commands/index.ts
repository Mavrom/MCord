/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { _bindBuiltInCommands, commands } from "../../../api/commands";
import { Devs } from "../../../utils/constants";
import { definePlugin } from "../../../utils/types";

export default definePlugin({
    name: "CommandsAPI",
    description: "Plugin'lerin kendi eğik çizgi komutlarını kaydetmesini sağlar",
    authors: [Devs.MCord],
    required: true,

    /**
     * `getBuiltInCommands` fonksiyonu bu Discord build'inde webpack anahtarıyla
     * bulunamıyor. referans katalog güncel yöntemi: `BUILT_IN_COMMANDS` dizisi hiçbir
     * yerde export edilmediği için `,"tableflip","unflip"` kaynak imzasından
     * modülü bul, `.filter(...)` çağrısındaki diziyi yakala. `_bind` diziyi
     * olduğu gibi geri döndürüyor — patch basit kalsın diye.
     */
    patches: [{
        find: ',"tableflip","unflip"',
        reason: "getBuiltInCommands finder'ı bu build'de kırık — referans katalog gibi BUILT_IN_COMMANDS dizisini kaynaktan yakala.",
        replacement: {
            match: /(?<=\i=)(\i)(\.filter\(.{0,60}tableflip)/,
            replace: "$self._bind($1)$2"
        }
    }],

    _bind(builtInCommands: any[]) {
        _bindBuiltInCommands(builtInCommands);
        return builtInCommands;
    },

    /** Patch tutmadıysa (Discord imzayı değiştirdi) komutlar sessizce yok. */
    get registeredCount() {
        return commands.length;
    }
});
