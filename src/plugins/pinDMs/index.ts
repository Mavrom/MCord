/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { type ContextMenuPatch } from "../../api/contextMenu";
import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { Logger } from "../../utils/logger";
import { definePlugin, OptionType, StartAt } from "../../utils/types";
import { PrivateChannelSortStore } from "../../webpack/common";
import { reorder } from "./reorder";

const logger = new Logger("PinDMs", "#a6d189");

const settings = definePluginSettings({
    pinned: {
        type: OptionType.CUSTOM,
        description: "Sabitlenen özel mesaj kanallarının kimlikleri",
        default: [] as string[]
    },
    pinOrderNewestFirst: {
        type: OptionType.BOOLEAN,
        description: "Sabitlenenler arasında en son sabitlenen üstte olsun",
        default: false
    }
});

export function getPinned(): string[] {
    const value = settings.store.pinned;
    return Array.isArray(value) ? value : [];
}

function setPinned(ids: string[]): void {
    settings.store.pinned = ids;
}

export function isPinned(channelId: string): boolean {
    return getPinned().includes(channelId);
}

export function togglePin(channelId: string): void {
    const pinned = getPinned();
    const index = pinned.indexOf(channelId);

    if (index === -1) pinned.push(channelId);
    else pinned.splice(index, 1);

    setPinned([...pinned]);
}

const contextMenuPatch: ContextMenuPatch = (children, props) => {
    const channelId = props?.channel?.id;
    if (!channelId) return;

    children.push({
        type: "mcord-pin-dm",
        id: "mcord-pin-dm",
        label: isPinned(channelId) ? "Sabitlemeyi kaldır" : "Sabitle",
        action: () => togglePin(channelId)
    });
};

export default definePlugin({
    name: "PinDMs",
    description: "Özel mesaj kanallarını listenin başına sabitler",
    authors: [Devs.MCord],
    tags: ["ui", "kalite-yasam"],
    settings,
    dependencies: ["ContextMenuAPI"],

    contextMenus: {
        "user-context": contextMenuPatch,
        "gdm-context": contextMenuPatch
    },

    // Kod patch'i yok: sıralama fonksiyonu webpack'ten erişilebilir (plan §5.1, §6.6).
    requiresRestart: false,
    startAt: StartAt.ConnectionOpen,

    start() {
        // Store ada göre bulunuyor; property adları mangle edilse de
        // `getName()` sabit kalıyor.
        if (typeof PrivateChannelSortStore?.getPrivateChannelIds !== "function") {
            logger.error("PrivateChannelSortStore bulunamadı.");
            return;
        }

        this.patcher.after(PrivateChannelSortStore, "getPrivateChannelIds", (_self, _args, returnValue) => {
            if (!Array.isArray(returnValue)) return returnValue;

            // `getSortedPrivateChannels` kanal nesnesi döndürüyor olabilir.
            const isIdList = typeof returnValue[0] === "string";
            const ids = isIdList ? returnValue : returnValue.map((c: any) => c?.id);

            const sorted = reorder(ids, getPinned(), settings.store.pinOrderNewestFirst);

            if (isIdList) return sorted;

            const byId = new Map(returnValue.map((c: any) => [c?.id, c]));
            return sorted.map(id => byId.get(id)).filter(Boolean);
        });
    }
});
