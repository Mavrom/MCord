/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "HideProfileConnections",
    description: "Kullanıcı profilindeki bağlı hesaplar bölümünü gizler",
    authors: [Devs.Berk],
    tags: ["gizlilik","ui"],
    requiresRestart: false,

    managedStyle: `[class*="userInfoSection_"] [class*="connectedAccounts_"] { display: none !important; }
`
});
