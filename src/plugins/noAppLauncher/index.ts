/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "NoAppLauncher",
    description: "Sohbet kutusundaki uygulama başlatıcı (etkinlikler) düğmesini gizler",
    authors: [Devs.Berk],
    tags: ["ui"],
    requiresRestart: false,

    managedStyle: `[class*="buttons_"] button[aria-label*="Uygulama" i], [class*="buttons_"] button[aria-label*="Activities" i] { display: none !important; }
`
});
