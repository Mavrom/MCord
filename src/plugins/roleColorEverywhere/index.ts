/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { definePlugin, OptionType } from "../../utils/types";
import { ChannelStore, GuildStore } from "../../webpack/common";
import { findStoreLazy } from "../../webpack/lazy";

const GuildMemberStore = findStoreLazy("GuildMemberStore");
const settings = definePluginSettings({
    chatMentions: { type: OptionType.BOOLEAN, description: "Sohbet bahsetmelerini rol rengiyle göster", default: true },
    voiceUsers: { type: OptionType.BOOLEAN, description: "Ses kullanıcılarını rol rengiyle göster", default: true }
});

export default definePlugin({
    name: "RoleColorEverywhere",
    description: "Kullanıcının en üst rol rengini bahsetmelere ve ses listesine uygular",
    authors: [Devs.Berk],
    tags: ["rol", "görünüm"],
    settings,

    patches: [
        {
            find: ".USER_MENTION)",
            reason: "Kullanıcı bahsetmesinin renk props'u yerel mention bileşeninde oluşturuluyor.",
            predicate: () => settings.store.chatMentions,
            replacement: {
                match: /(?<=user:(\i),guildId:([^,]+?),.{0,100}?children:\i=>\i)\((\i)\)/,
                replace: "({...$3,color:$self.colorInt($1?.id,$2)})"
            }
        },
        {
            find: "GUEST_NAME_SUFFIX",
            reason: "Ses katılımcısı adının style alanı yalnız inline kullanıcı satırında eklenebiliyor.",
            predicate: () => settings.store.voiceUsers,
            replacement: {
                match: /GUEST_NAME_SUFFIX.{0,50}?""\](?<=guildId:(\i),.+?user:(\i).+?)/,
                replace: "$&,style:$self.colorStyle($2.id,$1)"
            }
        }
    ],

    color(userId: string, channelOrGuildId: string): string | null {
        const guildId = ChannelStore?.getChannel?.(channelOrGuildId)?.guild_id ?? GuildStore?.getGuild?.(channelOrGuildId)?.id ?? channelOrGuildId;
        return GuildMemberStore?.getMember?.(guildId, userId)?.colorString ?? null;
    },

    colorInt(userId: string, channelOrGuildId: string): number | undefined {
        const value = this.color(userId, channelOrGuildId);
        return value ? Number.parseInt(value.slice(1), 16) : undefined;
    },

    colorStyle(userId: string, channelOrGuildId: string): Record<string, string> | undefined {
        const color = this.color(userId, channelOrGuildId);
        return color ? { color } : undefined;
    }
});
