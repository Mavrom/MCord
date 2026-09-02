/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "BetterUploadButton",
    description: "Dosya yüklemeyi sol tıkla açar, ek seçenek menüsünü sağ tıkla gösterir",
    authors: [Devs.Berk],
    tags: ["dosya", "kısayol"],

    patches: [{
        find: ".CHAT_INPUT_BUTTON_NOTIFICATION,",
        reason: "Ek düğmesinin click ve double-click callback'leri aynı inline JSX props nesnesinde.",
        replacement: {
            match: /onClick:(\i\?void 0:\i)(?=,onDoubleClick:(\i\?void 0:\i),)/,
            replace: "$&,...$self.overrides(arguments[0],$1,$2)"
        }
    }],

    overrides(props: any, menuAction: any, uploadAction: any): Record<string, any> {
        if (!props?.className?.includes?.("attachButton")) return {};
        return { onClick: uploadAction, onContextMenu: menuAction };
    }
});
