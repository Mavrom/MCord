/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "BetterGifPicker",
    description: "GIF seçicisini varsayılan olarak Favoriler kategorisinde açar",
    authors: [Devs.Berk],
    tags: ["gif", "kullanışlılık"],

    patches: [{
        find: "renderHeaderContent(){",
        reason: "GIF picker'ın ilk kategori seçimi sınıfın başlangıç state nesnesinde sabit.",
        replacement: {
            match: /(?<=state=\{resultType:)null/,
            replace: '"Favorites"'
        }
    }]
});
