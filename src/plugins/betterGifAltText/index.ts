/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "BetterGifAltText",
    description: "GIF alternatif metnine dosya adından okunabilir bir açıklama ekler",
    authors: [Devs.Berk],
    tags: ["erişilebilirlik", "medya"],

    patches: [
        {
            find: ".modalContext})};",
            reason: "GIF görsel props'u render fonksiyonunun yerel parametresi olarak tutuluyor.",
            replacement: {
                match: /(return.{0,12}\.jsx.{0,60}isWindowFocused)/,
                replace: "$self.improveAlt(e);$1"
            }
        },
        {
            find: "#{intl::GIF}",
            reason: "Varsayılan GIF alt metni JSX props oluşturulurken atanıyor.",
            replacement: {
                match: /alt:(\i)=(\i\.\i\.string\(\i\.\i#{intl::GIF}\))(?=,[^}]*}=(\i))/,
                replace: "alt_mcord:$1=$self.improveAlt($3)||$2"
            }
        }
    ],

    improveAlt(props: any): string | undefined {
        if (!props || (props.contentType && props.contentType !== "image/gif")) return props?.alt;
        if (props.alt && props.alt !== "GIF") return props.alt;

        let source = props.original ?? props.src;
        if (typeof source !== "string") return props.alt ?? "GIF";
        try { source = decodeURI(source); } catch { /* bozuk URL */ }

        const filename = source.split("/").pop()?.split("?")[0] ?? "";
        const words = filename
            .replace(/\.gif$/i, "")
            .replace(/\d+/g, "")
            .split(/[,_\-\s]+/)
            .filter(Boolean)
            .slice(0, 20)
            .join(" ")
            .slice(0, 300);

        props.alt = words ? `GIF - ${words}` : "GIF";
        return props.alt;
    }
});
