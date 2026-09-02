/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { definePlugin, OptionType } from "../../utils/types";
import { ChannelStore, transitionTo } from "../../webpack/common";
import { findStoreLazy } from "../../webpack/lazy";
import { React } from "../../webpack/react";

const VoiceStateStore = findStoreLazy("VoiceStateStore");
const settings = definePluginSettings({
    showChannelName: {
        type: OptionType.BOOLEAN,
        description: "Simgenin üzerine gelindiğinde ses kanalı adını göster",
        default: true
    }
});

function VoiceIndicator({ userId }: { userId: string }) {
    const readState = () => VoiceStateStore?.getVoiceStateForUser?.(userId) ?? null;
    const [voiceState, setVoiceState] = React.useState<any>(readState);

    React.useEffect(() => {
        const update = () => setVoiceState(readState());
        VoiceStateStore?.addChangeListener?.(update);
        update();
        return () => VoiceStateStore?.removeChangeListener?.(update);
    }, [userId]);

    const channel = voiceState?.channelId ? ChannelStore?.getChannel?.(voiceState.channelId) : null;
    if (!channel) return null;

    return (
        <button
            type="button"
            title={settings.store.showChannelName ? `${channel.name} ses kanalında` : "Ses kanalında"}
            aria-label={`${channel.name} ses kanalına git`}
            onClick={event => {
                event.stopPropagation();
                transitionTo?.(`/channels/${channel.guild_id}/${channel.id}`);
            }}
            style={{ border: 0, padding: "0 3px", marginLeft: 3, background: "transparent", color: "var(--status-positive)", cursor: "pointer" }}
        >
            ◖◗
        </button>
    );
}

export default definePlugin({
    name: "UserVoiceShow",
    description: "Mesaj yazarının bulunduğu ses kanalını gösterir ve simgeye tıklayınca kanala gider",
    authors: [Devs.Berk],
    tags: ["ses", "mesaj"],
    dependencies: ["MessageDecorationsAPI"],
    settings,

    renderMessageDecoration(props: Record<string, any>) {
        const userId = props?.message?.author?.id;
        return userId ? <VoiceIndicator userId={userId} /> : null;
    }
});
