/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "NoUnblockToJump",
    description: "Engellenen veya yok sayılan kullanıcıların mesajlarına engeli kaldırmadan atlar",
    authors: [Devs.Berk],
    tags: ["mesaj", "kullanışlılık"],

    patches: [{
        find: "#{intl::UNIGNORE_TO_JUMP_BODY}",
        reason: "Mesaja atlama izni, engel uyarısını açan yerel kontrolün içinde gömülü.",
        replacement: {
            match: /if\(\i\.\i\.isBlockedForMessage\(/,
            replace: "return true;$&"
        }
    }]
});
