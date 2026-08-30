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
    required: true

    // Kod patch'i yok, fonksiyon patch'i yok: `updateMessage` saf bir
    // `FluxDispatcher.dispatch({type:"MESSAGE_UPDATE", ...})` çağrısı
    // (bkz. src/api/messageUpdater.ts). Bu plugin sadece bağımlılık işaretçisi:
    // kullanan plugin `dependencies: ["MessageUpdaterAPI"]` yazınca API'nin
    // varlığı garanti altına alınıyor.
});
