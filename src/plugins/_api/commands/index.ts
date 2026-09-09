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
     * bulunamıyor. Bilinen yöntem: `BUILT_IN_COMMANDS` dizisi hiçbir
     * yerde export edilmediği için `,"tableflip","unflip"` kaynak imzasından
     * modülü bul, `.filter(...)` çağrısındaki diziyi yakala. `_bind` diziyi
     * olduğu gibi geri döndürüyor — patch basit kalsın diye.
     */
    // Kanıtlanmış açık-kaynak istemcinin (Vencord) güncel `CommandsAPI`
    // patch'lerinin portu.
    patches: [
        {
            // BUILT_IN_COMMANDS dizisini yakala (hiçbir yerde export edilmiyor).
            find: ',"tableflip","unflip"',
            reason: "BUILT_IN_COMMANDS dizisini kaynaktan yakala. Vencord CommandsAPI portu.",
            replacement: {
                match: /(?<=\w=)(\w)(\.filter\(.{0,60}tableflip)/,
                replace: "$self._bind($1)$2"
            }
        },
        {
            // Komut listesinde "Built-In" yerine plugin adını göster.
            find: "#{intl::COMMANDS_OPTIONAL_COUNT}",
            reason: "Komut menüsünde MCord komutlarının kaynağını göster. Vencord CommandsAPI portu.",
            replacement: {
                match: /children:(?=\i\?\?\i\?\.name)(?<=command:(\i),.+?)/,
                replace: "children:$1.plugin??"
            }
        }
    ],

    _bind(builtInCommands: any[]) {
        _bindBuiltInCommands(builtInCommands);
        return builtInCommands;
    },

    /** Patch tutmadıysa (Discord imzayı değiştirdi) komutlar sessizce yok. */
    get registeredCount() {
        return commands.length;
    }
});
