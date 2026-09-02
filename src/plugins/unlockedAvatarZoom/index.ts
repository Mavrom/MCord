/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { definePlugin, OptionType } from "../../utils/types";

const settings = definePluginSettings({
    multiplier: {
        type: OptionType.SLIDER,
        description: "Avatar kırpma ekranının en yüksek yakınlaştırması",
        markers: [2, 4, 6, 8, 10, 12, 14, 16],
        default: 4,
        stickToMarkers: true
    }
});

export default definePlugin({
    name: "UnlockedAvatarZoom",
    description: "Avatar kırpma aracında daha fazla yakınlaştırmaya izin verir",
    authors: [Devs.Berk],
    tags: ["avatar", "medya"],
    settings,

    patches: [{
        find: "#{intl::AVATAR_UPLOAD_EDIT_MEDIA}",
        reason: "Avatar kırpma kaydırıcısının üst sınırı bileşen props'unda sabit sayı.",
        replacement: {
            match: /maxValue:\d+/,
            replace: "maxValue:$self.settings.store.multiplier"
        }
    }]
});
