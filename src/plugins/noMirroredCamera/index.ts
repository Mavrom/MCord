/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

/**
 * Discord'da `mirror` anahtarlı bir ayar nesnesi artık yok (eski
 * `byKeys("getVideoDeviceId", "mirror")` hiçbir modüle uymuyordu). Ayna kararı
 * her çağıran bileşende ayrı hesaplanıp (`mirror: tip === USER && id === ben`)
 * prop olarak iniyor ve en sonda üç video bileşeninde `mirror` CSS sınıfına
 * dönüşüyor. Çağıranlar çok (çağrı ızgarası, PiP, kamera önizlemesi, ...), sınıfı
 * uygulayan yerler üç; o yüzden kararı sınıfın uygulandığı yerde kapatıyoruz.
 *
 * `mirror` yalnız kendi kameran için `true` geliyor; başkalarının videosu zaten
 * hiç aynalanmıyor, yani bu patch'ler yalnız kendi görüntünü etkiliyor.
 * Vencord'da ve Equicord'da bu plugin'in karşılığı yok.
 */
export default definePlugin({
    name: "NoMirroredCamera",
    description: "Kendi kamera önizlemenin ayna (yatay çevrilmiş) gösterimini kapatır",
    authors: [Devs.Berk],
    tags: ["ses"],

    patches: [
        {
            // Ortak video kutusu (çağrı ızgarası, kamera önizlemesi, ...).
            find: /emptyPreviewAspectRatio:\i="16 \/ 9"/,
            reason: "Ayna, video sarmalayıcı bileşenin içinde `mirror` prop'undan CSS sınıfına çevriliyor; bileşen memo'lu ve prop'u dışarıdan değiştirecek bir export yok.",
            replacement: {
                match: /(?<=\[\i\.mirror\]:)\i(?=\})/,
                replace: "!1"
            }
        },
        {
            // Yakınlaştırılmış (zoom/pan) video görünümü.
            find: "reportContainerResized:!1}",
            reason: "Yakınlaştırma görünümü ayna sınıfını kendi render'ında ayrıca uyguluyor; karar bileşen içinde.",
            replacement: {
                match: /(?<=\[\i\.mirror\]:)\i(?=\})/,
                replace: "!1"
            }
        },
        {
            // Resim içinde resim (PiP) penceresindeki video.
            find: "bStreamId:this.props.streamId",
            reason: "PiP videosu ayna sınıfını sınıf bileşeninin `render()`'ında `this.props.mirror`'dan uyguluyor.",
            replacement: {
                match: /(?<=className:\i\(\)\(\i\.\i,\i,\{\[\i\.\i\]:)\i(?=\}\),onDoubleClick:)/,
                replace: "!1"
            }
        }
    ]
});
