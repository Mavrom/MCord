/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { definePlugin, OptionType } from "../../utils/types";
import { RelationshipStore, SelectedChannelStore, UserStore } from "../../webpack/common";
import { findStoreLazy } from "../../webpack/lazy";
import { React } from "../../webpack/react";

const TypingStore = findStoreLazy("TypingStore");
const settings = definePluginSettings({
    includeCurrentChannel: { type: OptionType.BOOLEAN, description: "Seçili kanalda da göster", default: true },
    includeBlockedUsers: { type: OptionType.BOOLEAN, description: "Engellenen kullanıcıları dahil et", default: false }
});

function Indicator({ channelId }: { channelId: string }) {
    const compute = () => Object.keys(TypingStore?.getTypingUsers?.(channelId) ?? {}).filter(id =>
        id !== UserStore?.getCurrentUser?.()?.id
        && (settings.store.includeBlockedUsers || !RelationshipStore?.isBlocked?.(id))
    );
    const [users, setUsers] = React.useState<string[]>(compute);
    React.useEffect(() => {
        const update = () => setUsers(compute());
        TypingStore?.addChangeListener?.(update);
        update();
        return () => TypingStore?.removeChangeListener?.(update);
    }, [channelId]);

    if (!settings.store.includeCurrentChannel && SelectedChannelStore?.getChannelId?.() === channelId) return null;
    if (!users.length) return null;
    const names = users.map(id => UserStore?.getUser?.(id)?.globalName ?? UserStore?.getUser?.(id)?.username ?? id).join(", ");
    return <span title={`${names} yazıyor`} style={{ marginLeft: 6, letterSpacing: 1, color: "var(--text-muted)" }}>•••</span>;
}

export default definePlugin({
    name: "TypingIndicator",
    description: "Kanal listesinde biri yazarken hareketli olmayan bir gösterge gösterir",
    authors: [Devs.Berk],
    tags: ["bildirim", "görünüm"],
    settings,

    patches: [
        {
            find: "UNREAD_IMPORTANT:",
            reason: "Normal kanal satırının sağ aksesuarları yerel children ifadesinde oluşturuluyor.",
            replacement: {
                match: /\.Children\.count.+?:null(?<=,channel:(\i).+?)/,
                replace: "$&,$self.renderIndicator($1.id)"
            }
        },
        {
            find: "M0 15H2c0 1.6569",
            reason: "Konu satırındaki sayaçlar normal kanal satırından ayrı bir inline bileşende oluşturuluyor.",
            replacement: {
                match: /mentionsCount:\i.+?null(?<=channel:(\i).+?)/,
                replace: "$&,$self.renderIndicator($1.id)"
            }
        }
    ],

    renderIndicator(channelId: string) {
        return <Indicator channelId={channelId} />;
    }
});
