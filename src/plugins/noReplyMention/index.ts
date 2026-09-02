/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { Logger } from "../../utils/logger";
import { definePlugin, OptionType, StartAt } from "../../utils/types";
import { findByKeys } from "../../webpack/finder";

const logger = new Logger("NoReplyMention", "#a6d189");

const settings = definePluginSettings({
    exceptDirect: {
        type: OptionType.BOOLEAN,
        description: "Sana yapılan yanıtlarda (senin mesajına) yine de etiketle",
        default: false
    }
});

/**
 * SCAFFOLD — yanıt verirken `@` etiketini varsayılan olarak kapatır.
 * `allowedMentions.repliedUser` alanını mesaj gönderiminden önce `false`
 * yapan modülü webpack'ten bulup patch'liyor; canlı doğrulama gerek.
 */
export default definePlugin({
    name: "NoReplyMention",
    description: "Bir mesaja yanıt verirken karşı tarafı varsayılan olarak etiketlemez",
    authors: [Devs.Berk],
    tags: ["mesaj", "gizlilik"],
    settings,
    startAt: StartAt.WebpackReady,
    requiresRestart: false,

    start() {
        const MessageActions = findByKeys("sendMessage", "editMessage");
        if (!MessageActions?.sendMessage) {
            logger.warn("sendMessage modülü bulunamadı.");
            return;
        }
        this.patcher.before(MessageActions, "sendMessage", (_self, args) => {
            const opts = args[1];
            if (opts && typeof opts === "object" && opts.allowedMentions) {
                opts.allowedMentions.repliedUser = false;
            } else if (opts && typeof opts === "object") {
                opts.allowedMentions = { parse: ["users", "roles", "everyone"], repliedUser: false };
            }
        });
    }
});
