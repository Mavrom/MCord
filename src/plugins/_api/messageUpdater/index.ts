/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../../utils/constants";
import { definePlugin } from "../../../utils/types";

export default definePlugin({
    name: "MessageUpdaterAPI",
    description: "Plugin'lerin bir mesajı yeniden render etmeye zorlamasını sağlar",
    authors: [Devs.MCord],
    required: true,

    // Kanıtlanmış açık-kaynak istemcinin (Vencord) güncel `MessageUpdaterAPI`
    // patch'inin birebir portu: mesaj aksesuarları yeniden render kararını
    // özel bir mantıkla veriyor ve değişen mesaj referansını yoksayıyordu —
    // `"message"` bağımlılığını kaldırınca güncelleme re-render'ı tetikliyor.
    patches: [
        {
            find: "}renderStickersAccessories(",
            reason: "Mesaj güncellemesi aksesuar re-render'ını tetiklesin. Vencord MessageUpdaterAPI portu.",
            replacement: {
                match: /(?<=this\.props,\i,\[)"message",/,
                replace: ""
            }
        }
    ]
});
