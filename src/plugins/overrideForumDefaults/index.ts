/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { definePlugin, OptionType } from "../../utils/types";

const settings = definePluginSettings({
    layout: {
        type: OptionType.SELECT,
        description: "Varsayılan forum düzeni",
        options: [
            { label: "Liste", value: 1, default: true },
            { label: "Galeri", value: 2 }
        ]
    },
    sort: {
        type: OptionType.SELECT,
        description: "Varsayılan forum sıralaması",
        options: [
            { label: "Son etkinlik", value: 0, default: true },
            { label: "Gönderim tarihi", value: 1 }
        ]
    }
});

export default definePlugin({
    name: "OverrideForumDefaults",
    description: "Forum kanallarının varsayılan düzen ve sıralamasını değiştirir",
    authors: [Devs.Berk],
    tags: ["forum", "sunucu"],
    settings,

    patches: [{
        find: "getDefaultLayout(){",
        reason: "Forum varsayılanları kanal modelinin iki getter metodunda sabit.",
        replacement: [
            {
                match: /}getDefaultLayout\(\)\{/,
                replace: "$&return $self.settings.store.layout;"
            },
            {
                match: /}getDefaultSortOrder\(\)\{/,
                replace: "$&return $self.settings.store.sort;"
            }
        ]
    }]
});
