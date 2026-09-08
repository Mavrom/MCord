/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { Logger } from "../../utils/logger";
import { definePlugin } from "../../utils/types";

const logger = new Logger("BetterSessions", "#f4b8e4");

function enhanceDescription(props: any, description: any): any {
    try {
        const session = props?.session;
        const used = session?.approx_last_used_time;
        const date = used instanceof Date ? used : used ? new Date(used) : null;
        if (!date || Number.isNaN(date.getTime())) return description;

        const client = session?.client_info ?? {};
        const details = [client.os, client.platform, client.location].filter(Boolean).join(" · ");
        return (
            <span title={date.toLocaleString("tr-TR")}>
                {description}{details && !String(description).includes(details) ? ` · ${details}` : ""}
            </span>
        );
    } catch (error) {
        logger.warn("Oturum açıklaması zenginleştirilemedi; Discord'un özgün metni kullanılacak.", error);
        return description;
    }
}

export default definePlugin({
    name: "BetterSessions",
    description: "Cihazlar sayfasındaki oturumlara kesin son kullanım zamanı ve istemci ayrıntısı ekler",
    authors: [Devs.Berk],
    tags: ["güvenlik", "ayarlar"],

    patches: [{
        find: "#{intl::AUTH_SESSIONS_OS_UNKNOWN}",
        reason: "Discord oturum satırı açıklamasını özelleştirmek için bir ayarlar bileşeni kancası sunmuyor.",
        replacement: {
            match: /("text-muted",children:)(\i)(?=\}\)\]\}\),.{0,160}\.client_info\?\.location)/,
            replace: "$1$self.enhanceDescription(arguments[0],$2)"
        }
    }],

    enhanceDescription
});
