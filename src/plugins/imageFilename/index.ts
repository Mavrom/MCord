/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { definePlugin, OptionType } from "../../utils/types";

const settings = definePluginSettings({
    fullUrl: {
        type: OptionType.BOOLEAN,
        description: "Dosya adı yerine tam görsel adresini göster",
        default: false
    }
});

export default definePlugin({
    name: "ImageFilename",
    description: "Görsellerin üzerine gelince dosya adını araç ipucu olarak gösterir",
    authors: [Devs.Berk],
    tags: ["medya", "kullanışlılık"],
    settings,

    patches: [{
        find: ".RESPONSIVE?",
        reason: "Görsel bağlantı elementi ve kaynak URL'si aynı JSX props nesnesinde yerel değişken.",
        replacement: {
            match: /(?="data-role":"img","data-safe-src":)(?<=href:(\i).+?)/,
            replace: "title:$self.titleFor($1),"
        }
    }],

    titleFor(source: string): string | undefined {
        try {
            const url = new URL(source);
            const isGifHost = /(^|\.)(tenor|giphy|imgur)\.com$/i.test(url.hostname);
            const isImage = /\.(png|jpe?g|gif|webp|avif)$/i.test(url.pathname);
            if (!isGifHost && !isImage) return;
            return isGifHost || settings.store.fullUrl ? source : url.pathname.split("/").pop();
        } catch {
            return;
        }
    }
});
