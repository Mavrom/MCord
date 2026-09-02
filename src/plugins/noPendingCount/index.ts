/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { definePlugin, OptionType } from "../../utils/types";
import { byKeys } from "../../webpack/filters";
import { waitFor } from "../../webpack/lazy";

const settings = definePluginSettings({
    friendRequests: {
        type: OptionType.BOOLEAN,
        description: "Arkadaşlık isteği sayısını gizle",
        default: true,
        restartNeeded: true
    },
    messageRequests: {
        type: OptionType.BOOLEAN,
        description: "Mesaj isteği sayısını gizle",
        default: true,
        restartNeeded: true
    },
    premiumOffers: {
        type: OptionType.BOOLEAN,
        description: "Nitro teklif sayısını gizle",
        default: true,
        restartNeeded: true
    }
});

export default definePlugin({
    name: "NoPendingCount",
    description: "Arkadaşlık, mesaj isteği ve Nitro tekliflerinin kırmızı sayaçlarını gizler",
    authors: [Devs.Berk],
    tags: ["bildirim", "görünüm"],
    settings,

    patches: [
        {
            find: ".getSpamChannelsCount();return",
            reason: "Mesaj istekleri sekmesinin görünürlüğü, gizlenen sayaçtan ayrı gerçek sayıyı kullanmalı.",
            predicate: () => settings.store.messageRequests,
            replacement: {
                match: /(?<=getSpamChannelsCount\(\);return )\i\.getMessageRequestsCount\(\)/,
                replace: "$self.realMessageRequestCount()"
            }
        },
        {
            find: "showProgressBadge:",
            reason: "Nitro teklif rozeti iki yerel sayaç toplanarak oluşturuluyor.",
            predicate: () => settings.store.premiumOffers,
            replacement: {
                match: /(\{unviewedTrialCount:(\i),unviewedDiscountCount:(\i)\}.{0,800}?)\2\+\3/,
                replace: "$10"
            }
        }
    ],

    start() {
        this.cancelFriendWait = waitFor(byKeys(["getPendingCount"]), store => {
            if (settings.store.friendRequests && typeof store?.getPendingCount === "function") {
                this.patcher.instead(store, "getPendingCount", () => 0);
            }
        });

        this.cancelMessageWait = waitFor(byKeys(["getMessageRequestsCount"]), store => {
            this.messageRequestStore = store;
            if (settings.store.messageRequests && typeof store?.getMessageRequestsCount === "function") {
                this.patcher.instead(store, "getMessageRequestsCount", () => 0);
            }
        });
    },

    stop() {
        this.cancelFriendWait?.();
        this.cancelMessageWait?.();
        this.cancelFriendWait = undefined;
        this.cancelMessageWait = undefined;
        this.messageRequestStore = undefined;
    },

    realMessageRequestCount(): number {
        return this.messageRequestStore?.getMessageRequestChannelIds?.()?.size ?? 0;
    },

    cancelFriendWait: undefined as (() => void) | undefined,
    cancelMessageWait: undefined as (() => void) | undefined,
    messageRequestStore: undefined as any
});
