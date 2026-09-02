/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";
import { findStoreLazy } from "../../webpack/lazy";

const EmojiStore = findStoreLazy("EmojiStore");

export default definePlugin({
    name: "FavoriteEmojiFirst",
    description: "Emoji otomatik tamamlamasında favori emojileri listenin başına taşır",
    authors: [Devs.Berk],
    tags: ["emoji", "kullanışlılık"],

    patches: [
        {
            find: "renderResults({results:",
            reason: "Otomatik tamamlama sonuçları render çağrısından hemen önce yerel state içinde tutuluyor.",
            replacement: {
                match: /let \i=.{1,120}renderResults\(\{results:(\i)\.query\.results,/,
                replace: "$self.sortFavorites($1);$&"
            }
        },
        {
            find: "numEmojiResults:",
            reason: "Favoriler doğru sıralanabilsin diye Discord'un erken on sonuç dilimi sıralama sonrasına taşınmalı.",
            replacement: {
                match: /,maxCount:(\i)(.{1,600}\i)=(\i)\.slice\(0,(Math\.max\(\d+?,\i(?:-\i\.length){2}\))\)/,
                replace: ",maxCount:Infinity$2=($3.mcordSliceTo=$4,$3)"
            }
        }
    ],

    sortFavorites(state: any): void {
        const query = state?.query;
        const emojis = query?.results?.emojis;
        if (query?.type !== "EMOJIS_AND_STICKERS" || query?.typeInfo?.sentinel !== ":" || !emojis?.length) return;

        const context = EmojiStore?.getDisambiguatedEmojiContext?.();
        if (typeof context?.isFavoriteEmojiWithoutFetchingLatest !== "function") return;

        query.results.emojis = [...emojis]
            .sort((left, right) => Number(context.isFavoriteEmojiWithoutFetchingLatest(right))
                - Number(context.isFavoriteEmojiWithoutFetchingLatest(left)))
            .slice(0, emojis.mcordSliceTo ?? Infinity);
    }
});
