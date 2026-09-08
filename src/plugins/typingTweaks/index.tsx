/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { Logger } from "../../utils/logger";
import { definePlugin, OptionType } from "../../utils/types";
import { RelationshipStore, UserStore } from "../../webpack/common";
import { findStoreLazy } from "../../webpack/lazy";

const logger = new Logger("TypingTweaks", "#f4b8e4");
const GuildMemberStore = findStoreLazy("GuildMemberStore");
const TypingStore = findStoreLazy("TypingStore");

const settings = definePluginSettings({
    showAvatars: {
        type: OptionType.BOOLEAN,
        description: "Yazan kişilerin avatarlarını göster",
        default: true
    },
    showRoleColors: {
        type: OptionType.BOOLEAN,
        description: "Yazan kişilerin adlarında sunucu rol rengini kullan",
        default: true
    },
    compactSeveralUsers: {
        type: OptionType.BOOLEAN,
        description: "Üçten fazla kişi yazarken daha açıklayıcı kısa metin göster",
        default: true
    }
});

function getTypingUsers(channel: any): any[] {
    const currentUserId = UserStore?.getCurrentUser?.()?.id;
    const typing = TypingStore?.getTypingUsers?.(channel?.id) ?? {};

    return Object.keys(typing)
        .filter(id => id !== currentUserId && !RelationshipStore?.isBlockedOrIgnored?.(id))
        .map(id => UserStore?.getUser?.(id))
        .filter(Boolean);
}

function displayName(user: any, guildId?: string): string {
    return GuildMemberStore?.getNick?.(guildId, user.id)
        ?? RelationshipStore?.getNickname?.(user.id)
        ?? user.globalName
        ?? user.username;
}

function TypingUser({ user, guildId }: { user: any; guildId?: string }) {
    const color = settings.store.showRoleColors
        ? GuildMemberStore?.getMember?.(guildId, user.id)?.colorString
        : undefined;
    const avatar = user?.getAvatarURL?.(guildId, 32) ?? user?.getAvatarURL?.(null, 32);

    return (
        <strong style={{ color, display: "inline-flex", alignItems: "center", gap: 3 }}>
            {settings.store.showAvatars && avatar
                ? <img src={avatar} alt="" aria-hidden="true" width={16} height={16} style={{ borderRadius: "50%" }} />
                : null}
            {displayName(user, guildId)}
        </strong>
    );
}

function renderTypingUsers(props: any, children: any): any {
    try {
        const channel = props?.channel;
        const users = getTypingUsers(channel);
        if (!users.length) return children;

        const guildId = channel?.guild_id;
        if (settings.store.compactSeveralUsers && users.length > 3) {
            return (
                <>
                    <TypingUser user={users[0]} guildId={guildId} />, {" "}
                    <TypingUser user={users[1]} guildId={guildId} /> ve {users.length - 2} kişi daha yazıyor...
                </>
            );
        }

        if (!Array.isArray(children)) return children;
        let userIndex = 0;
        return children.map((child, index) => {
            if (child?.type !== "strong") return child;
            const user = users[userIndex++];
            return user
                ? <TypingUser key={user.id ?? index} user={user} guildId={guildId} />
                : child;
        });
    } catch (error) {
        logger.warn("Yazma göstergesi zenginleştirilemedi; Discord'un özgün göstergesi kullanılacak.", error);
        return children;
    }
}

export default definePlugin({
    name: "TypingTweaks",
    description: "Yazma göstergesine avatar ve rol renkli kullanıcı adları ekler",
    authors: [Devs.Berk],
    tags: ["görünüm", "yazıyor"],
    settings,

    patches: [{
        find: "#{intl::SEVERAL_USERS_TYPING_STRONG}",
        reason: "Discord yazma göstergesi, kullanıcı adlarını değiştirmek için bir bileşen kancası sunmuyor.",
        replacement: {
            match: /("aria-hidden":!0,children:)(\i)/,
            replace: "$1$self.renderTypingUsers(arguments[0],$2)"
        }
    }],

    renderTypingUsers
});
