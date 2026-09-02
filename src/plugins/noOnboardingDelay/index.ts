/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "NoOnboardingDelay",
    description: "Sunucu karşılama ekranındaki yapay bekleme süresini kaldırır",
    authors: [Devs.Berk],
    tags: ["sunucu", "hız"],

    patches: [{
        find: "#{intl::ONBOARDING_COVER_WELCOME_SUBTITLE}",
        reason: "Karşılama ekranının sabit üç saniyelik gecikmesi yalnızca modül yüklenirken değiştirilebilir.",
        replacement: {
            match: /(?<=setTimeout\([^,]{1,500},)3e3/,
            replace: "0"
        }
    }]
});
