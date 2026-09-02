/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { definePlugin, OptionType } from "../../utils/types";

const settings = definePluginSettings({
    lockout: {
        type: OptionType.BOOLEAN,
        description: "Kendini kanaldan kilitleme uyarısını atla",
        default: true,
        restartNeeded: true
    },
    onboarding: {
        type: OptionType.BOOLEAN,
        description: "Onboarding uyumsuzluğu nedeniyle izin değişikliğini engelleme",
        default: true,
        restartNeeded: true
    }
});

export default definePlugin({
    name: "PermissionFreeWill",
    description: "Kanal izin düzenleyicisindeki istemci tarafı koruma engellerini kaldırır",
    authors: [Devs.Berk],
    tags: ["izin", "sunucu"],
    settings,

    patches: [
        {
            find: "#{intl::STAGE_CHANNEL_CANNOT_OVERWRITE_PERMISSION}",
            reason: "İzin kilitleme koruması izin düzenleyici switch dalında yerel koşul.",
            predicate: () => settings.store.lockout,
            replacement: {
                match: /case"DENY":.{0,60}if\((?=\i\.\i\.can)/,
                replace: "$&true||"
            }
        },
        {
            find: "#{intl::ONBOARDING_CHANNEL_THRESHOLD_WARNING}",
            reason: "Onboarding izin denetimleri iki yerel async export getter'ında tanımlı.",
            predicate: () => settings.store.onboarding,
            replacement: {
                match: /{(?:\i:\(\)=>\i,?){2}}/,
                replace: matched => matched.replace(/\(\)=>[A-Za-z_$][\w$]*/g, "()=>()=>Promise.resolve(true)")
            }
        }
    ]
});
