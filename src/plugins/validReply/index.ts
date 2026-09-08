/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { discordApi } from "../../api/net";
import { Devs } from "../../utils/constants";
import { Logger } from "../../utils/logger";
import { definePlugin } from "../../utils/types";
import { getFluxDispatcher } from "../../webpack/common";

const logger = new Logger("ValidReply", "#f4b8e4");
const fetching = new Set<string>();
let replyStore: any = null;

export default definePlugin({
    name: "ValidReply",
    description: "Yüklenemedi görünen yanıtlanan mesajı üzerine gelince yeniden getirir",
    authors: [Devs.Berk],
    tags: ["mesaj", "yardımcı"],

    patches: [
        {
            find: "#{intl::REPLY_QUOTE_MESSAGE_NOT_LOADED}",
            reason: "Yüklenemeyen yanıt önizlemesinin mesaj referansı yalnız inline render props'unda bulunuyor.",
            replacement: {
                // intl anahtarı hem `find` hem `match` içinde canonicalize edilmeli.
                match: /#{intl::REPLY_QUOTE_MESSAGE_NOT_LOADED}\)/,
                replace: "$&,onMouseEnter:()=>$self.fetchReply(arguments[0])"
            }
        },
        {
            find: "ReferencedMessageStore",
            reason: "Yanıt önbelleği dışarı aktarılmayan store örneğinin özel map'inde tutuluyor.",
            replacement: {
                match: /_channelCaches=new Map;/,
                replace: "$&$self.captureStore(this);"
            }
        }
    ],

    captureStore(store: any): void {
        replyStore = store;
    },

    async fetchReply(props: any): Promise<void> {
        const reference = props?.baseMessage?.messageReference ?? props?.baseMessage?.message_reference;
        const channelId = reference?.channel_id ?? reference?.channelId;
        const messageId = reference?.message_id ?? reference?.messageId;
        if (!channelId || !messageId || fetching.has(messageId)) return;
        fetching.add(messageId);
        try {
            // Webpack RestAPI bu build'de güvenilmez — token + main-process fetch.
            const response = await discordApi<any[]>(
                `/channels/${channelId}/messages?limit=1&around=${messageId}`,
                { method: "GET" }
            );
            const message = Array.isArray(response.body)
                ? response.body.find((entry: any) => entry.id === messageId)
                : null;
            if (!message) return;
            replyStore?.set?.(channelId, messageId, { state: 0, message });
            getFluxDispatcher()?.dispatch?.({ type: "MESSAGE_UPDATE", message });
        } catch (error) {
            logger.warn("Yanıtlanan mesaj yeniden getirilemedi.", error);
        } finally {
            fetching.delete(messageId);
        }
    },

    stop() {
        fetching.clear();
        replyStore = null;
    }
});
