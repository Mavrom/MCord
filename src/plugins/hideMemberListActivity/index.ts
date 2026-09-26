/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "HideMemberListActivity",
    description: "Sunucu üye listesinin üstündeki 'Etkinlik' bölümünü (son etkinlik kartları) gizler",
    authors: [Devs.Berk],
    tags: ["ui"],
    requiresRestart: false,

    // Bölümün başlığı ve kartları `data-list-item-id="members-<sunucu>___…"`
    // taşıyor (başlık: `___content-inventory-feed-*`, kartlar: `___0`, `___1`…);
    // normal üye satırlarında bu kimlik yok.
    managedStyle: `[class*="members_"] > [class*="content_"] > :has([data-list-item-id*="___"]) { display: none !important; }
`
});
