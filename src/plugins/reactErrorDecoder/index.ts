/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { Logger } from "../../utils/logger";
import { definePlugin } from "../../utils/types";
import { React } from "../../webpack/react";

const logger = new Logger("ReactErrorDecoder", "#f4b8e4");
let messages: Record<string, string> | null = null;

export default definePlugin({
    name: "ReactErrorDecoder",
    description: "Minify edilmiş React hata kodlarını okunabilir hata metnine dönüştürür",
    authors: [Devs.Berk],
    tags: ["geliştirici", "hata"],

    patches: [{
        find: "React has blocked a javascript: URL as a security precaution.",
        reason: "React production hata metni yalnız hata oluşturucu fonksiyonda kod numarasına indirgeniyor.",
        replacement: {
            match: /"https:\/\/react\.dev\/errors\/"\+\i;/,
            replace: "$&const decoded=$self.decode(...arguments);if(decoded)return decoded;"
        }
    }],

    async start() {
        const version = React.version;
        if (typeof version !== "string") return;
        try {
            const response = await fetch(`https://raw.githubusercontent.com/facebook/react/v${version}/scripts/error-codes/codes.json`);
            if (response.ok) messages = await response.json();
        } catch (error) {
            logger.warn("React hata sözlüğü alınamadı; eklenti etkisiz kalacak.", error);
        }
    },

    stop() {
        messages = null;
    },

    decode(code: number, ...args: unknown[]): string | undefined {
        let index = 0;
        return messages?.[String(code)]?.replace(/%s/g, () => String(args[index++]));
    }
});
