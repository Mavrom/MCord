/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { definePlugin, OptionType } from "../../utils/types";
import { ChannelStore, UserStore } from "../../webpack/common";
import { findStoreLazy } from "../../webpack/lazy";

const ReadStateStore = findStoreLazy("ReadStateStore");
const settings = definePluginSettings({
    channels: {
        type: OptionType.SELECT,
        description: "Tek bildirim sesi uygulanacak özel mesaj türü",
        options: [
            { label: "Tümü", value: "all", default: true },
            { label: "Kişisel DM", value: "dm" },
            { label: "Grup DM", value: "group" }
        ]
    },
    allowMentions: {
        type: OptionType.BOOLEAN,
        description: "Sana doğrudan bahsedilince yeniden ses çal",
        default: false
    },
    allowEveryone: {
        type: OptionType.BOOLEAN,
        description: "Grup DM'de everyone/here için yeniden ses çal",
        default: false
    }
});

export default definePlugin({
    name: "OnePingPerDM",
    description: "Okunmamış bir özel mesaj dizisi için yalnızca ilk bildirim sesini çalar",
    authors: [Devs.Berk],
    tags: ["bildirim", "dm"],
    settings,

    patches: [{
        find: '"NotificationStore"',
        reason: "Bildirim sesi seçimi NotificationStore fabrikasının yerel mesaj parametresinde yapılıyor.",
        replacement: [
            {
                match: /(\i\.\i\.getDesktopType\(\)===\i\.\i\.NEVER)\)/,
                replace: "$&if(!$self.shouldSound(arguments[0]?.message))return;else "
            },
            {
                match: /sound:(\i\?\i:void 0,volume:\i,onClick)/,
                replace: "sound:!$self.shouldSound(arguments[0]?.message)?undefined:$1"
            }
        ]
    }],

    shouldSound(message: any): boolean {
        if (!message) return true;
        const channel = ChannelStore?.getChannel?.(message.channel_id);
        const type = channel?.type;
        if (type !== 1 && type !== 3) return true;
        if (type === 1 && settings.store.channels === "group") return true;
        if (type === 3 && settings.store.channels === "dm") return true;

        const ownId = UserStore?.getCurrentUser?.()?.id;
        if (settings.store.allowMentions && message.mentions?.some?.((user: any) => user.id === ownId)) return true;
        if (settings.store.allowEveryone && message.mention_everyone) return true;

        return ReadStateStore?.getOldestUnreadMessageId?.(message.channel_id) === message.id;
    }
});
