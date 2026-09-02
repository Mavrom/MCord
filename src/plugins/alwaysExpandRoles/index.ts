/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "AlwaysExpandRoles",
    description: "Profil açılır pencerelerindeki rol listesini daima açık gösterir",
    authors: [Devs.Berk],
    tags: ["rol", "profil"],

    patches: [{
        find: "hasDeveloperContextMenu:",
        reason: "Rol listesinin ilk React state değeri ve ölçüm koşulu aynı profil bileşeninde gömülü.",
        group: true,
        replacement: [
            {
                match: /(?<=\?\i\.current\[\i\].{0,120}?)useState\(!1\)/,
                replace: "useState(!0)"
            },
            {
                match: /(?<=useLayoutEffect\(\(\)=>\{if\()\i/,
                replace: "false"
            }
        ]
    }]
});
