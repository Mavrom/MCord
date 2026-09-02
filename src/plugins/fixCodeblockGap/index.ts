/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

const CODE_BLOCK_PATTERN = String.raw`/^${"```"}(?:([a-z0-9_+\-.#]+?)\n)?\n*([^\n][^]*?)\n*${"```"}`;

export default definePlugin({
    name: "FixCodeblockGap",
    description: "Kod bloklarıyla altındaki metin arasındaki gereksiz boşluğu kaldırır",
    authors: [Devs.Berk],
    tags: ["görünüm", "mesaj"],

    patches: [{
        find: CODE_BLOCK_PATTERN,
        reason: "Kod bloğu markdown deseni Discord'un ayrıştırıcı kuralında sabit string olarak tutuluyor.",
        replacement: {
            match: CODE_BLOCK_PATTERN,
            replace: "$&\\n?"
        }
    }]
});
