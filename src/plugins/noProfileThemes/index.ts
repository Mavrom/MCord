/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";
import { UserStore } from "../../webpack/common";

export default definePlugin({
    name: "NoProfileThemes",
    description: "Kendi profilin dışında Nitro profil temalarını devre dışı bırakır",
    authors: [Devs.Berk],
    tags: ["profil", "görünüm"],

    patches: [{
        find: "hasThemeColors(){",
        reason: "Premium profil özelleştirme izni kullanıcı profil modelinin getter'ında hesaplanıyor.",
        replacement: {
            match: /get canUsePremiumProfileCustomization\(\)\{return /,
            replace: "$&$self.isCurrentUser(this?.userId)&&"
        }
    }],

    isCurrentUser(userId: string): boolean {
        return userId === UserStore?.getCurrentUser?.()?.id;
    }
});
