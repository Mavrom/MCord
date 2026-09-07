/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { addMemberListDecorator, removeMemberListDecorator } from "../../api/memberListDecorators";
import { definePluginSettings } from "../../api/settings";
import { IconVoice } from "../../components/Icons";
import { Tooltip } from "../../components/Tooltip";
import { Devs } from "../../utils/constants";
import { definePlugin, OptionType } from "../../utils/types";
import { ChannelStore, GuildStore, NavigationRouter } from "../../webpack/common";
import { findStoreLazy } from "../../webpack/lazy";
import { React } from "../../webpack/react";

const VoiceStateStore = findStoreLazy("VoiceStateStore");

const settings = definePluginSettings({
    showChannelName: {
        type: OptionType.BOOLEAN,
        description: "Kanal adını göster (kapalıysa yalnızca simge)",
        default: true
    },
    memberList: { type: OptionType.BOOLEAN, description: "Üye listesinde göster", default: true },
    messages: { type: OptionType.BOOLEAN, description: "Mesajlarda (ve DM'lerde) göster", default: true }
});

function VoiceIndicator({ userId, small }: { userId: string; small?: boolean }) {
    const read = () => VoiceStateStore?.getVoiceStateForUser?.(userId) ?? null;
    const [voiceState, setVoiceState] = React.useState<any>(read);

    React.useEffect(() => {
        const update = () => setVoiceState(read());
        VoiceStateStore?.addChangeListener?.(update);
        update();
        return () => VoiceStateStore?.removeChangeListener?.(update);
    }, [userId]);

    const channel = voiceState?.channelId ? ChannelStore?.getChannel?.(voiceState.channelId) : null;
    if (!channel) return null;

    const guild = channel.guild_id ? GuildStore?.getGuild?.(channel.guild_id) : null;
    const guildIcon = guild?.icon
        ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${String(guild.icon).startsWith("a_") ? "gif" : "webp"}?size=24`
        : null;

    const where = guild?.name ?? "Özel arama";
    const label = `${channel.name} — ${where}`;

    // Üye listesinde yer dar: yalnızca simge (+ varsa sunucu ikonu), ad ve dolgu
    // yok — tüm bilgi ipucu balonunda. Mesajlarda tam etiket.
    const compact = small === true;
    const showName = settings.store.showChannelName && !compact;

    return (
        <Tooltip text={label}>
            <button
                type="button"
                aria-label={`${channel.name} kanalını aç (${where})`}
                onClick={event => {
                    event.preventDefault();
                    event.stopPropagation();
                    // Yalnızca kanalı ekranda aç — sese katılma.
                    NavigationRouter?.transitionTo?.(`/channels/${channel.guild_id ?? "@me"}/${channel.id}`);
                }}
                style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: compact ? "2px" : "4px",
                    padding: compact ? 0 : (showName ? "1px 6px 1px 3px" : "1px 3px"),
                    border: 0,
                    borderRadius: "4px",
                    cursor: "pointer",
                    verticalAlign: "middle",
                    fontFamily: "inherit",
                    fontSize: "12px",
                    fontWeight: 600,
                    lineHeight: 1.2,
                    background: compact ? "transparent" : "color-mix(in srgb, var(--brand-500, #5865f2) 16%, transparent)",
                    color: "var(--brand-500, #5865f2)"
                }}
            >
                {guildIcon && !compact && (
                    <img
                        src={guildIcon}
                        alt=""
                        width={14}
                        height={14}
                        style={{ borderRadius: "50%", flex: "0 0 auto", objectFit: "cover" }}
                    />
                )}
                <IconVoice size={13} color="currentColor" strokeWidth={2.4} />
                {showName && (
                    <span style={{ maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {channel.name}
                    </span>
                )}
            </button>
        </Tooltip>
    );
}

export default definePlugin({
    name: "UserVoiceShow",
    description: "Bir kullanıcının hangi ses kanalında olduğunu isim yanında etiket olarak gösterir; tıklayınca kanalı açar (sese katılmaz)",
    authors: [Devs.Berk],
    tags: ["ses", "mesaj", "görünüm"],
    dependencies: ["MessageDecorationsAPI", "MemberListDecoratorsAPI"],
    settings,

    renderMessageDecoration(props: Record<string, any>) {
        const userId = props?.message?.author?.id;
        return settings.store.messages && userId
            ? <VoiceIndicator userId={userId} />
            : null;
    },

    start() {
        addMemberListDecorator("UserVoiceShow", props =>
            settings.store.memberList && props?.user?.id
                ? <VoiceIndicator userId={props.user.id} small />
                : null);
    },

    stop() {
        removeMemberListDecorator("UserVoiceShow");
    }
});
