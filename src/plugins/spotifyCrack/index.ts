/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { definePlugin, OptionType } from "../../utils/types";

const settings = definePluginSettings({
    disableAutoPause: {
        type: OptionType.BOOLEAN,
        description: "Ses kanalındayken Spotify otomatik duraklatmasını kapat",
        default: true,
        restartNeeded: true
    },
    keepActivityWhenIdle: {
        type: OptionType.BOOLEAN,
        description: "Boştayken Spotify etkinliğini göstermeye devam et",
        default: false,
        restartNeeded: true
    }
});

export default definePlugin({
    name: "SpotifyCrack",
    description: "Birlikte dinlemeyi açar, otomatik duraklatmayı ve idle gizlemeyi kontrol eder",
    authors: [Devs.Berk],
    tags: ["spotify", "medya"],
    settings,

    patches: [
        {
            find: 'dispatch({type:"SPOTIFY_PROFILE_UPDATE"',
            reason: "Birlikte dinleme premium kontrolü Spotify profil yanıtı işlenirken yerel ürün alanında.",
            replacement: {
                match: /SPOTIFY_PROFILE_UPDATE.+?isPremium:(?="premium"===(\i)\.body\.product)/,
                replace: (matched, request) => `${matched}(${request}.body.product="premium")&&`
            }
        },
        {
            find: "}getPlayableComputerDevices(){",
            reason: "Spotify otomatik duraklatma ve idle görünürlük kontrolleri aynı store fabrikasında.",
            replacement: [
                {
                    match: /(?<=function \i\(\)\{)(?=.{0,220}SPOTIFY_AUTO_PAUSED\))/,
                    replace: "return;",
                    predicate: () => settings.store.disableAutoPause
                },
                {
                    match: /(shouldShowActivity\(\)\{.{0,60})&&!\i\.\i\.isIdle\(\)/,
                    replace: "$1",
                    predicate: () => settings.store.keepActivityWhenIdle
                }
            ]
        }
    ]
});
