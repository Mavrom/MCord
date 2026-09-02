/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "BiggerEmojiPicker",
    description: "Emoji / GIF / sticker seçicisini büyütür",
    authors: [Devs.Berk],
    tags: ["ui"],
    requiresRestart: false,

    managedStyle: `
[class*="positionLayer_"] [class*="contentWrapper_"] { width: 480px !important; height: 560px !important; }
`
});
