/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { definePlugin, OptionType } from "../../utils/types";

const settings = definePluginSettings({
    onlySnow: {
        type: OptionType.BOOLEAN,
        description: "Yalnızca Snow Halation zil sesini kullan",
        default: false,
        restartNeeded: true
    }
});

export default definePlugin({
    name: "SecretRingToneEnabler",
    description: "Discord'un nadir gizli zil sesi sürümünü her aramada çalar",
    authors: [Devs.Berk],
    tags: ["ses", "eğlence"],
    settings,

    patches: [{
        find: '"call_ringing_beat"',
        reason: "Gizli zil sesi seçimi ses adı listesindeki rastgele 1/1000 koşuluna bağlı.",
        replacement: [
            {
                match: /500!==\i\(\)\.random\(1,1e3\)/,
                replace: "false"
            },
            {
                match: /"call_ringing_beat",/,
                replace: "",
                predicate: () => settings.store.onlySnow
            }
        ]
    }]
});
