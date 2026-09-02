/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "ConsoleJanitor",
    description: "Discord konsolundaki tekrarlanan ve işlevsiz uyarıları susturur",
    authors: [Devs.Berk],
    tags: ["geliştirici", "konsol"],

    patches: [
        {
            find: "Unable to determine render window for element",
            reason: "Gürültülü uyarı doğrudan console.warn çağrısı olarak derleniyor.",
            replacement: { match: /console\.warn\("Unable to determine render window for element",\i\),/, replace: "" }
        },
        {
            find: "Tried getting Dispatch instance before instantiated",
            reason: "Başlangıçtaki zararsız dispatcher uyarısı inline logger çağrısıdır.",
            replacement: { match: /null==\i&&\i\.warn\("Tried getting Dispatch instance before instantiated"\),/, replace: "" }
        },
        {
            find: "Window state not initialized",
            reason: "Pencere durumu hazırlanırken çıkan geçici uyarı doğrudan console.warn çağrısıdır.",
            replacement: { match: /console\.warn\("Window state not initialized",\i\),/, replace: "" }
        }
    ]
});
