/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";
import { RelationshipStore } from "../../webpack/common";

export default definePlugin({
    name: "SortFriendRequests",
    description: "Gelen ve giden arkadaşlık isteklerini tarihe göre sıralar",
    authors: [Devs.Berk],
    tags: ["arkadaşlar", "düzen"],

    patches: [{
        find: "getRelationshipCounts(){",
        reason: "Arkadaş satırlarının sıralama anahtarı ilişki listesi oluşturulurken inline hesaplanıyor.",
        replacement: {
            match: /\}\)\.sortBy\((.+?)\)\.value\(\)/,
            replace: "}).sortBy(row=>$self.sortKey(($1),row)).value()"
        }
    }],

    sortKey(original: (row: any) => unknown, row: any): unknown {
        if (row?.type !== 3 && row?.type !== 4) return original(row);
        const since = Number(RelationshipStore?.getSince?.(row.user?.id));
        return Number.isFinite(since) ? -since : original(row);
    }
});
