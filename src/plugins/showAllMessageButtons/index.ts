/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "ShowAllMessageButtons",
    description: "Shift tuşuna gerek kalmadan tüm mesaj işlem düğmelerini gösterir",
    authors: [Devs.Berk],
    tags: ["mesaj", "görünüm"],

    patches: [{
        find: "#{intl::MESSAGE_UTILITIES_A11Y_LABEL}",
        reason: "Mesaj işlem çubuğunun genişletilmiş hali inline Shift koşuluyla seçiliyor.",
        replacement: {
            match: /isExpanded:\i&&(.+?),/,
            replace: "isExpanded:$1,"
        }
    }]
});
