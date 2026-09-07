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
import { ChannelStore, transitionTo } from "../../webpack/common";
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

    const showName = settings.store.showChannelName;
    const label = `${channel.name} ses kanalında`;

    return (
        <Tooltip text={label}>
            <button
                type="button"
                aria-label={`${channel.name} kanalını aç`}
                onClick={event => {
                    event.preventDefault();
                    event.stopPropagation();
                    // Yalnızca kanalı ekranda aç — sese katılma.
                    transitionTo?.(`/channels/${channel.guild_id ?? "@me"}/${channel.id}`);
                }}
                style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "3px",
                    marginLeft: "4px",
                    padding: showName ? "1px 6px 1px 4px" : "1px 3px",
                    border: 0,
                    borderRadius: "4px",
                    cursor: "pointer",
                    verticalAlign: "middle",
                    fontFamily: "inherit",
                    fontSize: small ? "11px" : "12px",
                    fontWeight: 600,
                    lineHeight: 1.2,
                    background: "color-mix(in srgb, var(--brand-500, #5865f2) 16%, transparent)",
                    color: "var(--brand-500, #5865f2)"
                }}
            >
                <IconVoice size={small ? 12 : 13} color="currentColor" strokeWidth={2.4} />
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
