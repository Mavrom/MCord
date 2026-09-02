/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { definePlugin, OptionType } from "../../utils/types";
import { UserStore } from "../../webpack/common";

const settings = definePluginSettings({
    defaultToSuper: {
        type: OptionType.BOOLEAN,
        description: "Reaksiyon seçicisini Süper Reaksiyon kipinde aç",
        default: true
    },
    unlimitedPlaying: {
        type: OptionType.BOOLEAN,
        description: "Aynı anda oynayan Süper Reaksiyon sınırını kaldır",
        default: false
    },
    playingLimit: {
        type: OptionType.SLIDER,
        description: "Aynı anda oynayabilecek Süper Reaksiyon sayısı",
        markers: [0, 5, 10, 20, 40, 60, 80, 100],
        default: 20,
        stickToMarkers: true
    }
});

export default definePlugin({
    name: "SuperReactionTweaks",
    description: "Süper Reaksiyon varsayılanını ve eşzamanlı animasyon sınırını özelleştirir",
    authors: [Devs.Berk],
    tags: ["reaksiyon", "emoji"],
    settings,

    patches: [
        {
            find: ",BURST_REACTION_EFFECT_PLAY",
            reason: "Oynayan burst reaksiyon sayısı Flux eylem işleyicisinde inline sınırla karşılaştırılıyor.",
            replacement: {
                match: /(BURST_REACTION_EFFECT_PLAY:(?:\i=>|function\(\i\))\{.+?if\()(\(?(?:function)?\(\i,\i\)(?:=>)?\{.+?\(\i,\i\))>=5+?(?=\))/,
                replace: (_matched, prefix, countExpression) => `${prefix}!$self.canPlay(${countExpression})`
            }
        },
        {
            find: ".EMOJI_PICKER_CONSTANTS_EMOJI_CONTAINER_PADDING_HORIZONTAL)",
            reason: "Reaksiyon picker'ının burst başlangıç state'i yerel useState çağrısında sabit false.",
            replacement: {
                match: /(openPopoutType:void 0(?=.+?isBurstReaction:(\i).+?;(\i===\i\.\i\.REACTION)&&\i\.push\().+?\[\2,\i\]=\i\.useState\()!1\)/,
                replace: (_matched, prefix, _burstVariable, reactionIntent) =>
                    `${prefix}$self.defaultToSuper&&${reactionIntent})`
            }
        }
    ],

    canPlay(currentCount: number): boolean {
        return settings.store.unlimitedPlaying || currentCount < settings.store.playingLimit;
    },

    get defaultToSuper(): boolean {
        return settings.store.defaultToSuper && UserStore?.getCurrentUser?.()?.premiumType != null;
    }
});
