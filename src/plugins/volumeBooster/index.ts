/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { definePlugin, OptionType } from "../../utils/types";

/**
 * Kanıtlanmış açık-kaynak istemcinin (Vencord) `VolumeBooster` plugin'inin
 * portu.
 *
 * Eski MCord sürümü `start()` içinde eager `find(byKeys(["setLocalVolume"]))`
 * ile `setLocalVolume`'u sarıyordu: modül o an yüklü olmadığı için hiç
 * bağlanmıyordu, üstelik kaydırıcının üst sınırı 200'de kaldığından kullanıcı
 * yükseltilmiş sesi zaten seçemiyordu. Doğru çözüm kaydırıcının `maxValue`
 * hesabını kod patch'iyle değiştirmek.
 *
 * Web/Vesktop'a özel `streamSourceNode` patch grubu **bilinçli olarak dışarıda**
 * — MCord yalnız Discord masaüstü uygulamasına enjekte oluyor, o kod yolu hiç
 * çalışmıyor ve reporter'da "kırık patch" olarak görünürdü.
 */

/** Vencord'un `makeRange(1, 5, 0.5)` yardımcısının açılımı. */
const MULTIPLIER_MARKERS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

const settings = definePluginSettings({
    multiplier: {
        type: OptionType.SLIDER,
        description: "Ses çarpanı (varsayılan üst sınır × çarpan)",
        markers: MULTIPLIER_MARKERS,
        default: 2,
        stickToMarkers: true
    }
});

export default definePlugin({
    name: "VolumeBooster",
    description: "Kullanıcı ve yayın sesini varsayılan üst sınırın üstüne çıkarmanı sağlar",
    authors: [Devs.Berk],
    tags: ["ses"],
    settings,
    requiresRestart: true,

    patches: [
        // Kullanıcı ses kaydırıcısının üst sınırı.
        {
            find: "#{intl::USER_VOLUME}",
            reason: "Kullanıcı ses kaydırıcısının `maxValue` hesabı.",
            replacement: {
                match: /(?<=maxValue:)\i\.isPlatformEmbedded\?(\i\.\i):\i\.\i(?=,)/,
                replace: (_m: string, higherMaxVolume: string) =>
                    `${higherMaxVolume}*$self.settings.store.multiplier`
            }
        },
        // Yayın (stream) ses kaydırıcısının üst sınırı.
        {
            find: "currentVolume:",
            reason: "Yayın ses kaydırıcısının `maxValue` hesabı.",
            replacement: {
                match: /(?<=maxValue:)\i\.\i\?(\d+?):\d+?(?=,)/,
                replace: (_m: string, higherMaxVolume: string) =>
                    `${higherMaxVolume}*$self.settings.store.multiplier`
            }
        },
        // Discord'un ses bağlamı senkronizasyonu 200 üstü değerleri sunucuya
        // göndermeye çalışıp hata veriyor; gönderimden önce 200'e kırpıyoruz.
        {
            find: "AudioContextSettingsMigrated",
            reason: "200 üstü yerel ses seviyeleri sunucuya senkronlanmamalı.",
            replacement: [
                {
                    match: /(?<=isLocalMute\(\i,\i\),volume:(\i).+?\(0,\i\.\i\)\(\i,\i,\{volume:)\1(?=\}\))/,
                    replace: "$&>200?200:$&"
                },
                {
                    match: /(?<=Object\.entries\(\i\.localMutes\).+?volume:).+?(?=,)/,
                    replace: "$&>200?200:$&"
                },
                {
                    match: /(?<=Object\.entries\(\i\.localVolumes\).+?volume:).+?(?=})/,
                    replace: "$&>200?200:$&"
                }
            ]
        },
        // MediaEngineStore, senkronizasyondan gelen (kırpılmış) değerlerle
        // bizim 200 üstü yerel seviyelerimizin üstüne yazmasın.
        {
            find: '="MediaEngineStore",',
            reason: "Senkronizasyon 200 üstü yerel ses seviyelerini ezmemeli.",
            replacement: [
                {
                    match: /(\.settings\.audioContextSettings.+?)(\i\[\i\])=(\i\.volume)(.+?setLocalVolume\(\i,).+?\)/,
                    replace: (_m: string, rest1: string, localVolume: string, syncVolume: string, rest2: string) =>
                        rest1
                        + `(${localVolume}>200?void 0:${localVolume}=${syncVolume})`
                        + rest2
                        + `${localVolume}??${syncVolume})`
                }
            ]
        }
    ]
});
