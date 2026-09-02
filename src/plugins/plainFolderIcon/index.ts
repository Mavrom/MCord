/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "PlainFolderIcon",
    description: "Sunucu klasörü simgelerini sade (Discord varsayılanı öncesi) haline getirir",
    authors: [Devs.Berk],
    tags: ["ui"],
    requiresRestart: false,

    managedStyle: `
[class*="folderGroupBackground_"] { display: none !important; }
[class*="folderIcon_"] { opacity: 1 !important; }
`
});
