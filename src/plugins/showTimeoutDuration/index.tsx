/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";
import { ChannelStore } from "../../webpack/common";
import { findStoreLazy } from "../../webpack/lazy";
import { React } from "../../webpack/react";

const GuildMemberStore = findStoreLazy("GuildMemberStore");

function Countdown({ deadline }: { deadline: number }) {
    const [now, setNow] = React.useState(Date.now());
    React.useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, []);
    const seconds = Math.max(0, Math.ceil((deadline - now) / 1000));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds / 60) % 60;
    return <span style={{ color: "var(--status-danger)", marginLeft: 4 }}>{hours ? `${hours} sa ` : ""}{minutes} dk</span>;
}

export default definePlugin({
    name: "ShowTimeoutDuration",
    description: "Zaman aşımı simgesinin yanında kalan süreyi gösterir",
    authors: [Devs.Berk],
    tags: ["sunucu", "yardımcı"],

    patches: [{
        find: "GUILD_COMMUNICATION_DISABLED_ICON_TOOLTIP_BODY",
        reason: "Zaman aşımı simgesi mesaj başlığında inline oluşturuluyor ve kalan süre için ayrı kanca yok.",
        replacement: {
            match: /(\i\.\i,\{text:.{0,30}GUILD_COMMUNICATION_DISABLED_ICON_TOOLTIP_BODY.+?\}\))(?<=message:(\i).+?)/,
            replace: "$1,$self.renderCountdown($2)"
        }
    }],

    renderCountdown(message: any) {
        const guildId = ChannelStore?.getChannel?.(message?.channel_id)?.guild_id;
        const until = guildId ? GuildMemberStore?.getMember?.(guildId, message?.author?.id)?.communicationDisabledUntil : null;
        const deadline = until ? new Date(until).getTime() : 0;
        return deadline > Date.now() ? <Countdown deadline={deadline} /> : null;
    }
});
