/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

function asDate(value: any): Date | null {
    const date = value instanceof Date ? value : new Date(value?.valueOf?.() ?? value);
    return Number.isNaN(date.getTime()) ? null : date;
}

export default definePlugin({
    name: "ReplyTimestamp",
    description: "Yanıtlanan mesaj önizlemesine tarih ve saat ekler",
    authors: [Devs.Berk],
    tags: ["mesaj", "görünüm"],

    patches: [{
        find: "#{intl::REPLY_QUOTE_MESSAGE_NOT_LOADED}",
        reason: "Yanıt önizlemesinin children dizisi başka bir UI kancası sunmuyor.",
        replacement: {
            match: /\.onClickReply,.+?}\),(?=\i,\i,\i\])/,
            replace: "$&$self.renderTimestamp(arguments[0]),"
        }
    }],

    renderTimestamp(props: any) {
        const message = props?.referencedMessage?.message;
        const date = asDate(message?.timestamp);
        if (!date) return null;
        return <time dateTime={date.toISOString()} style={{ marginRight: 6, color: "var(--text-muted)" }}>[{date.toLocaleString("tr-TR")}]</time>;
    }
});
