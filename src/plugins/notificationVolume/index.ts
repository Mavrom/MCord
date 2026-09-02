/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { definePlugin, OptionType } from "../../utils/types";

const settings = definePluginSettings({
    volume: {
        type: OptionType.SLIDER,
        description: "Bildirim ve uygulama içi ses düzeyi (%)",
        markers: [0, 25, 50, 75, 100],
        default: 100
    }
});

export default definePlugin({
    name: "NotificationVolume",
    description: "Bildirim sesleri için ana çıkıştan ayrı ses düzeyi belirler",
    authors: [Devs.Berk],
    tags: ["bildirim", "ses"],
    settings,

    patches: [{
        find: "ensureAudio(){",
        reason: "Bildirim ses düzeyi Audio nesnesi hazırlanırken ana çıkış değeriyle inline çarpılıyor.",
        replacement: {
            match: /(?=Math\.min\(\i\.\i\.getOutputVolume\(\)\/100)/g,
            replace: "$self.settings.store.volume/100*"
        }
    }]
});
