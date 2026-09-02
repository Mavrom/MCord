/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { Logger } from "../../utils/logger";
import { definePlugin, OptionType } from "../../utils/types";

const logger = new Logger("FixImagesQuality", "#a6d189");
const settings = definePluginSettings({
    originalInChat: {
        type: OptionType.BOOLEAN,
        description: "Sohbette de özgün dosyayı yükle (daha fazla trafik ve bellek kullanır)",
        default: false
    }
});

export default definePlugin({
    name: "FixImagesQuality",
    description: "Ek görsellerini daha yüksek veya özgün çözünürlükte yükler",
    authors: [Devs.Berk],
    tags: ["medya", "kalite"],
    settings,

    patches: [{
        find: ".handleImageLoad)",
        reason: "Görsel CDN URL'si sınıfın getSrc metodunda yerel props'tan üretiliyor.",
        replacement: {
            match: /getSrc\(\i\)\{/,
            replace: "$&var mcordSrc=$self.getSource(this?.props,arguments[1]);if(mcordSrc)return mcordSrc;"
        }
    }],

    getSource(props: any, frozen?: boolean): string | undefined {
        if (typeof props?.src !== "string" || props.src.startsWith("data:")) return;

        try {
            const isImage = props.contentType?.startsWith?.("image/") ?? typeof props.mosaicStyleAlt === "boolean";
            if (!isImage) return;

            const url = new URL(props.src);
            if (!url.pathname.startsWith("/attachments/")) return;

            url.searchParams.set("animated", String(!frozen));
            if (frozen && url.pathname.toLowerCase().endsWith(".gif")) url.searchParams.set("format", "webp");

            const inModal = Boolean(props.trigger);
            if (!settings.store.originalInChat && !inModal) {
                const width = Number(props.width) || 0;
                const height = Number(props.height) || 0;
                const pixels = width * height;
                const limit = 2_400_000;
                if (pixels > limit) {
                    const scale = Math.sqrt(pixels / limit);
                    url.searchParams.set("width", String(Math.round(width / scale)));
                    url.searchParams.set("height", String(Math.round(height / scale)));
                }
                return url.toString();
            }

            url.hostname = "cdn.discordapp.com";
            return url.toString();
        } catch (err) {
            logger.warn("Görsel URL'si iyileştirilemedi; özgün değer kullanılacak.", err);
            return;
        }
    }
});
