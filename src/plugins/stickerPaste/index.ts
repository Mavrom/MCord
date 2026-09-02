/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "StickerPaste",
    description: "Sticker seçince anında göndermek yerine sohbet kutusuna ekler",
    authors: [Devs.Berk],
    tags: ["sticker", "mesaj"],

    patches: [{
        find: ".stickers,previewSticker:",
        reason: "Sticker seçiminde gönderme veya taslak ekleme kararı picker işleyicisinde yerel koşul.",
        replacement: {
            match: /if\(\i\.\i\.getUploadCount/,
            replace: "return true;$&"
        }
    }]
});
