/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { modifyMessageAccessories } from "../../../api/messageAccessories";
import { Devs } from "../../../utils/constants";
import { definePlugin } from "../../../utils/types";

export default definePlugin({
    name: "MessageAccessoriesAPI",
    description: "Plugin'lerin mesaj gövdesinin altına aksesuar eklemesini sağlar",
    authors: [Devs.Berk],
    required: true,

    patches: [{
        // Discord intl anahtarlarını hash'liyor — ham string bundle'da yok,
        // `#{intl::…}` işaretçisiyle canonicalize edilmeli (referans katalog ile aynı).
        find: "#{intl::REMOVE_ATTACHMENT_BODY}",
        reason: "Mesaj aksesuarları sınıf render metodundaki yerel children dizisinde oluşturuluyor.",
        replacement: {
            match: /children:(\[[^\]]{0,100}?this\.renderSuppressConfirmModal[^\]]{0,100}?\])/,
            replace: "children:$self.modify($1,this?.props)"
        }
    }],

    modify: modifyMessageAccessories
});
