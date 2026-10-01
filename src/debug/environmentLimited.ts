/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/*
 * Reporter ortamında (headless tarayıcı, giriş yok, native ses motoru yok)
 * doğrulanamayan store'lar ve aramalar. Hem `reporter.ts` (CI'da "kırık"
 * saymaz) hem `scannerExport.ts` (scanner'a `envLimited` bayrağı yollar)
 * kullanır. Bu dosya yalnızca `filters`'a bağlıdır; ikisinden de import
 * edilmesi üretim paketini etkilemez (reporter zaten stub'la değişiyor).
 */

import { describeFilter } from "../webpack/filters";
import type { ModuleFilter } from "../webpack/types";

/**
 * Bu ortamda (headless tarayici, giris yok, native ses motoru yok) Discord'un
 * hic olusturmadigi store'lar. Gercek masaustu istemcide calisiyorlar; CI
 * sinyalini kirletmemeleri icin "kirik" saymiyoruz.
 *
 *  - ReadStateStore   : okunma durumu, oturum gerektiriyor
 *  - MediaEngineStore : Discord'un native ses motoru (headless'ta yok)
 *  - ChannelRTCStore  : RTC/ses baglantisi
 */
export const ENVIRONMENT_LIMITED_STORES = new Set([
    "ReadStateStore",
    "MediaEngineStore",
    "ChannelRTCStore"
]);

/**
 * Bu ortamda modülü **hiç yüklenmeyen** aramalar.
 *
 * `ENVIRONMENT_LIMITED_STORES` ile aynı gerekçe, aramalar için. Ölçüm (2026-09-10,
 * stable, `loadLazyChunks` sonrası): bu anahtar kümelerini sağlayan **gerçek**
 * modül sayısı `0`, buna karşılık her anahtara cevap veren Discord loader
 * proxy'si (`$$loader`/`$$baseObject`, `Symbol.toStringTag === "IntlMessagesProxy"`)
 * sayısı `63`. Yani modüller oturum arkasında; `/login` sayfasında yoklar.
 *
 * DİKKAT — bunlar bir ara "bulunuyor" görünüyordu: `find` cache'i
 * `Object.getOwnPropertyNames` ile gezdiği için `_blacklistBadModules`'ün
 * non-enumerable yaptığı O PROXY'LERE eşleşiyorlardı. Sahte bir yeşildi ve
 * gerçek istemcide `React`'in i18n proxy'sine bağlanıp Discord'u siyah ekrana
 * düşürmesiyle patladı. Doğrusu: proxy'yi eleyip burada dürüstçe
 * "doğrulanamıyor" demek.
 */
export const ENVIRONMENT_LIMITED_FINDS = [
    ["editMessage", "sendMessage"],
    ["sendMessage", "editMessage"],
    ["clearCache", "_channelMessages"],
    ["deleteMessage", "startEditMessage"],
    ["open", "saveAccountChanges"],
    ["ModalRoot", "ModalHeader", "ModalContent"],
    ["MenuGroup", "MenuItem", "MenuSeparator"],
    ["SUPPORTS_COPY", "copy"],
    ["setHangStatus", "clearHangStatus"],
    ["getVideoDeviceId", "mirror"],
    // stable'da bulunuyor, canary'de o chunk `/login`'de yüklenmiyor.
    ["selectChannel", "selectVoiceChannel"]
].map(keys => `byKeys(${keys.map(k => JSON.stringify(k)).join(", ")})`);

export function isEnvironmentLimitedStore(name: string): boolean {
    return ENVIRONMENT_LIMITED_STORES.has(name);
}

/** `describeFilter` çıktısıyla (ör. `byKeys("a", "b")`) karşılaştırır. */
export function isEnvironmentLimitedDescription(description: string): boolean {
    return ENVIRONMENT_LIMITED_FINDS.includes(description);
}

export function isEnvironmentLimitedFind(filter: ModuleFilter): boolean {
    return isEnvironmentLimitedDescription(describeFilter(filter));
}

/**
 * Scanner dışa aktarımındaki bir arama etiketi (`store: X` ya da
 * `describeFilter` çıktısı) ortam kısıtlı mı?
 */
export function isEnvironmentLimitedLabel(label: string): boolean {
    const storePrefix = "store: ";
    return label.startsWith(storePrefix)
        ? isEnvironmentLimitedStore(label.slice(storePrefix.length))
        : isEnvironmentLimitedDescription(label);
}
