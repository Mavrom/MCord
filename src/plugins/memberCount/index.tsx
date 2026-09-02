/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";
import { ChannelStore, SelectedChannelStore } from "../../webpack/common";
import { findStoreLazy } from "../../webpack/lazy";
import { React } from "../../webpack/react";

const GuildMemberCountStore = findStoreLazy("GuildMemberCountStore");
const ChannelMemberStore = findStoreLazy("ChannelMemberStore");

function Count() {
    const compute = () => {
        const channelId = SelectedChannelStore?.getChannelId?.();
        const guildId = ChannelStore?.getChannel?.(channelId)?.guild_id;
        const total = guildId ? GuildMemberCountStore?.getMemberCount?.(guildId) : null;
        const groups = guildId ? ChannelMemberStore?.getProps?.(guildId, channelId)?.groups ?? [] : [];
        const online = groups.reduce((sum: number, group: any) => sum + (group.id === "offline" ? 0 : Number(group.count ?? 0)), 0);
        return { total, online };
    };
    const [count, setCount] = React.useState(compute);
    React.useEffect(() => {
        const update = () => setCount(compute());
        GuildMemberCountStore?.addChangeListener?.(update);
        ChannelMemberStore?.addChangeListener?.(update);
        SelectedChannelStore?.addChangeListener?.(update);
        return () => {
            GuildMemberCountStore?.removeChangeListener?.(update);
            ChannelMemberStore?.removeChangeListener?.(update);
            SelectedChannelStore?.removeChangeListener?.(update);
        };
    }, []);
    if (count.total == null) return null;
    return <div style={{ padding: "8px 12px", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
        <span style={{ color: "var(--status-positive)" }}>{count.online || "?"} çevrimiçi</span> · {count.total} üye
    </div>;
}

export default definePlugin({
    name: "MemberCount",
    description: "Üye listesinin üstünde çevrimiçi ve toplam sunucu üyesi sayısını gösterir",
    authors: [Devs.Berk],
    tags: ["sunucu", "bilgi"],

    patches: [{
        find: "{isSidebarVisible:",
        reason: "Üye listesi panelinin children dizisi dışarıdan dekoratör kabul etmiyor.",
        replacement: {
            match: /children:\[(\i\.useMemo[^}]+"aria-multiselectable")(?<=className:(\i),.+?)/,
            replace: "children:[$2?.includes('members')?$self.renderCount():null,$1"
        }
    }],

    renderCount() {
        return <Count />;
    }
});
