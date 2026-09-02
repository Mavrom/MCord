/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { Logger } from "../../utils/logger";
import { definePlugin } from "../../utils/types";
import { byKeys } from "../../webpack/filters";
import { find } from "../../webpack/finder";
import { findStoreLazy } from "../../webpack/lazy";

const logger = new Logger("GifPaste", "#a6d189");
const ExpressionPickerStore = findStoreLazy("ExpressionPickerStore");

export default definePlugin({
    name: "GifPaste",
    description: "GIF seçince anında göndermek yerine bağlantısını sohbet kutusuna ekler",
    authors: [Devs.Berk],
    tags: ["gif", "mesaj"],

    patches: [{
        find: "handleSelectGIF=",
        reason: "GIF picker seçimi sınıf alanı olarak tanımlı ve gönderme davranışı yerel callback içinde.",
        replacement: {
            match: /handleSelectGIF=(\i)=>\{/,
            replace: "$&if(!this?.props?.className)return $self.insertGif($1);"
        }
    }],

    insertGif(gif: any): void {
        if (typeof gif?.url !== "string") return;

        const dispatch = find<any>(byKeys(["dispatchToLastSubscribed"]), { silent: true });
        if (typeof dispatch?.dispatchToLastSubscribed !== "function") {
            logger.warn("Sohbet kutusu metin dağıtıcısı bulunamadı.");
            return;
        }

        const text = `${gif.url} `;
        dispatch.dispatchToLastSubscribed("INSERT_TEXT", { rawText: text, plainText: text });
        ExpressionPickerStore?.closeExpressionPicker?.();
    }
});
