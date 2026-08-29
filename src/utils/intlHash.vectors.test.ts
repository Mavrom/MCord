/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/**
 * `runtimeHashMessageKey` altın değer (golden vector) testi.
 *
 * Discord'un i18n hash'i bir bit bile kayarsa `#{intl::}` kullanan **her**
 * patch sessizce kırılır — hata vermez, sadece eşleşmez. Bu, uygulamanın en
 * sinsi kırılma noktası; bu yüzden hash'i sabit beklenen çıktılara karşı
 * kilitliyoruz (plan §5.7, §16).
 *
 * Beklenen değerler XXH64 + base64 spesifikasyonundan bağımsız bir
 * implementasyonla üretildi. `intlHash.ts` refactor edilirse bu tablo
 * değişmemeli; değişiyorsa hash bozulmuş demektir.
 */

import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { runtimeHashMessageKey } from "./intlHash";

/** `[anahtar, beklenen 6 karakterlik hash]` */
const VECTORS: [key: string, expected: string][] = [
    ["MESSAGE_ACTIONS_LABEL", "SWa2uc"],
    ["SEARCH", "5h0QOP"],
    ["OK", "TyCVIq"],
    ["CANCEL", "ETE/oC"],
    ["a", "W26Mqf"],
    ["ab", "YUrQks"],
    ["abc", "mQl3rf"],
    ["GUILD_SETTINGS_ROLES", "K1nkFa"],
    ["USER_SETTINGS_ACCOUNT", "Cpc2Lv"],
    ["NITRO_UPSELL_TITLE", "vnDAl/"],
    ["Trying to open a changelog for an invalid build number", "c064xk"],
    ["CHANNEL_MESSAGE_PIN_TOOLTIP", "tbUKer"],
    ["MEMBER_LIST_HEADER", "SI7s9y"],
    ["VOICE_CHANNEL_EMPTY", "KncwkK"]
];

/**
 * 1000 üretilmiş anahtarın çıktısının toplu özeti.
 *
 * Tek tek 1000 beklenen değeri dosyaya gömmek yerine hepsinin birleşiminin
 * SHA-256'sı tutuluyor: aynı kapsam, okunabilir dosya.
 */
const BULK_DIGEST = "d5a96e4ac265f7918e99fd8a4fe3a2779545b9297de3c226ad9290b33565d71b";

const bulkKey = (i: number) => `KEY_${i}_${((i * 2654435761) % 999983).toString(36)}`;

describe("runtimeHashMessageKey", () => {
    it.each(VECTORS)("%s → %s", (key, expected) => {
        expect(runtimeHashMessageKey(key)).toBe(expected);
    });

    it("her hash 6 karakter ve base64 alfabesinde", () => {
        for (const [key] of VECTORS) {
            expect(runtimeHashMessageKey(key)).toMatch(/^[A-Za-z0-9+/]{6}$/);
        }
    });

    it("1000 anahtarda toplu özet sabit kalır", () => {
        let joined = "";
        for (let i = 0; i < 1000; i++) joined += runtimeHashMessageKey(bulkKey(i));

        expect(createHash("sha256").update(joined).digest("hex")).toBe(BULK_DIGEST);
    });
});
