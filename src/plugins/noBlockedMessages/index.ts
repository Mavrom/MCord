/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { runtimeHashMessageKey } from "../../utils/intlHash";
import { Logger } from "../../utils/logger";
import { definePlugin, OptionType } from "../../utils/types";
import { i18n, RelationshipStore } from "../../webpack/common";

const logger = new Logger("NoBlockedMessages", "#a6d189");

const settings = definePluginSettings({
    ignoreMessages: {
        type: OptionType.BOOLEAN,
        description: "Engellenen kullanıcılardan gelen mesajları tamamen yok say (bildirim/okunmadı dahil)",
        default: false,
        restartNeeded: true
    },
    applyToIgnoredUsers: {
        type: OptionType.BOOLEAN,
        description: "'Yok sayılan' kullanıcılara da uygula",
        default: false,
        restartNeeded: true
    }
});

/**
 * Kanıtlanmış açık-kaynak istemcinin (Vencord) `NoBlockedMessages` patch'lerinin
 * portu.
 *
 * Eski MCord sürümü `start()` içinde eager `findByKeys("isBlocked", …)` +
 * `findStore("MessageStore")` kullanıp `getMessages`'ı sarıyordu; modüller o an
 * yüklü olmadığı için çalışmıyordu. Kod patch'i "X engellenmiş mesaj"
 * ayıracını doğrudan render'da eliyor.
 */
export default definePlugin({
    name: "NoBlockedMessages",
    description: "Engellenen kullanıcıların mesajlarını ('X engellenmiş mesaj' ayıracı dahil) tamamen gizler",
    authors: [Devs.Berk],
    tags: ["gizlilik"],
    settings,
    requiresRestart: true,

    patches: [
        {
            find: ".__invalid_blocked,",
            reason: "'X engellenmiş mesaj' daraltma bileşeni burada render ediliyor.",
            replacement: {
                match: /let\{messages:\i,[^}]*?collapsedReason[^}]*\}/,
                replace: "if($self.shouldHide(arguments[0]))return null;$&"
            }
        },
        {
            find: '"MessageStore"',
            reason: "Engellenen kullanıcı mesajları store'a hiç girmesin.",
            predicate: () => settings.store.ignoreMessages,
            replacement: {
                match: /(?<=MESSAGE_CREATE:function\((\i)\)\{)/,
                replace: (_m: string, props: string) =>
                    `if($self.shouldIgnoreMessage(${props}.message))return;`
            }
        },
        {
            find: '"ReadStateStore"',
            reason: "Engellenen kullanıcı mesajları okunmadı sayacını artırmasın.",
            predicate: () => settings.store.ignoreMessages,
            replacement: {
                match: /(?<=MESSAGE_CREATE:function\((\i)\)\{)/,
                replace: (_m: string, props: string) =>
                    `if($self.shouldIgnoreMessage(${props}.message))return;`
            }
        }
    ],

    shouldIgnoreUser(userId?: string): boolean {
        if (userId == null) return false;
        try {
            if (RelationshipStore?.isBlocked?.(userId)) return true;
            if (settings.store.applyToIgnoredUsers && (RelationshipStore as any)?.isIgnored?.(userId)) {
                return true;
            }
        } catch { /* store hazır değil */ }
        return false;
    },

    shouldIgnoreMessage(message: any): boolean {
        return this.shouldIgnoreUser(message?.author?.id);
    },

    shouldHide(props: { collapsedReason?: () => any }): boolean {
        try {
            const collapsedReason = props.collapsedReason?.();
            const is = (key: string) => collapsedReason === (i18n as any).t[runtimeHashMessageKey(key)]();

            return is("BLOCKED_MESSAGE_COUNT")
                || (settings.store.applyToIgnoredUsers && is("IGNORED_MESSAGE_COUNT"));
        } catch (err) {
            logger.error("Mesajın gizlenip gizlenmeyeceği belirlenemedi:", err);
            return false;
        }
    }
});
