/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";
import { ChannelStore, MessageStore, SelectedChannelStore, UserStore } from "../../webpack/common";
import { find, findByKeys, findStore } from "../../webpack/finder";

const shortcutNames = [
    "mcordChannel",
    "mcordChannelId",
    "mcordFind",
    "mcordFindByKeys",
    "mcordFindStore",
    "mcordMe",
    "mcordMessages",
    "mcordReload"
] as const;

function defineShortcut(name: string, value: unknown, getter = false): void {
    Object.defineProperty(window, name, {
        configurable: true,
        enumerable: false,
        ...(getter ? { get: value as () => unknown } : { value, writable: false })
    });
}

export default definePlugin({
    name: "ConsoleShortcuts",
    description: "Discord geliştirici konsoluna sık kullanılan MCord ve webpack kısayollarını ekler",
    authors: [Devs.Berk],
    tags: ["geliştirici", "konsol"],

    start() {
        defineShortcut("mcordFind", find);
        defineShortcut("mcordFindByKeys", findByKeys);
        defineShortcut("mcordFindStore", findStore);
        defineShortcut("mcordReload", () => location.reload());
        defineShortcut("mcordChannelId", () => SelectedChannelStore?.getChannelId?.(), true);
        defineShortcut("mcordChannel", () => ChannelStore?.getChannel?.(SelectedChannelStore?.getChannelId?.()), true);
        defineShortcut("mcordMe", () => UserStore?.getCurrentUser?.(), true);
        defineShortcut("mcordMessages", () => MessageStore?.getMessages?.(SelectedChannelStore?.getChannelId?.()), true);

        defineShortcut("shortcutList", Object.fromEntries(shortcutNames.map(name => [name, (window as any)[name]])));
    },

    stop() {
        for (const name of [...shortcutNames, "shortcutList"]) delete (window as any)[name];
    }
});
