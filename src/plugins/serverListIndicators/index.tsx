/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { addServerListElement, removeServerListElement } from "../../api/serverList";
import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { definePlugin, OptionType } from "../../utils/types";
import { GuildStore, RelationshipStore } from "../../webpack/common";
import { findStoreLazy } from "../../webpack/lazy";
import { React } from "../../webpack/react";

const PresenceStore = findStoreLazy("PresenceStore");
const JoinRequestStore = findStoreLazy("UserGuildJoinRequestStore");

const settings = definePluginSettings({
    mode: {
        type: OptionType.SELECT,
        description: "Sunucu listesinin üstünde gösterilecek sayaç",
        options: [
            { label: "Çevrimiçi arkadaşlar", value: "friends", default: true },
            { label: "Sunucular", value: "servers" },
            { label: "İkisi de", value: "both" }
        ]
    }
});

function useStoreValue(stores: any[], compute: () => number): number {
    const [value, setValue] = React.useState(compute);

    React.useEffect(() => {
        const update = () => setValue(compute());
        for (const store of stores) store?.addChangeListener?.(update);
        update();
        return () => {
            for (const store of stores) store?.removeChangeListener?.(update);
        };
    }, []);

    return value;
}

function Indicator() {
    const friendCount = useStoreValue([RelationshipStore, PresenceStore], () => {
        const ids = RelationshipStore?.getFriendIDs?.() ?? [];
        return ids.filter((id: string) => (PresenceStore?.getStatus?.(id) ?? "offline") !== "offline").length;
    });
    const serverCount = useStoreValue([GuildStore, JoinRequestStore], () => {
        const guilds = GuildStore?.getGuilds?.() ?? {};
        const pending = JoinRequestStore?.computeGuildIds?.() ?? [];
        return Object.keys(guilds).length + pending.filter((id: string) => guilds[id] == null).length;
    });
    const mode = settings.store.mode;

    return (
        <div style={{ margin: "2px 0 6px", textAlign: "center", fontSize: 11, fontWeight: 600 }}>
            {(mode === "friends" || mode === "both") && <div>{friendCount} çevrimiçi</div>}
            {(mode === "servers" || mode === "both") && <div>{serverCount} sunucu</div>}
        </div>
    );
}

export default definePlugin({
    name: "ServerListIndicators",
    description: "Sunucu listesinin üstünde çevrimiçi arkadaş veya sunucu sayısını gösterir",
    authors: [Devs.Berk],
    tags: ["sunucu", "görünüm"],
    dependencies: ["ServerListAPI"],
    settings,
    requiresRestart: false,

    renderIndicator: () => <Indicator />,

    start() {
        addServerListElement("above", "ServerListIndicators", this.renderIndicator);
    },

    stop() {
        removeServerListElement("above", "ServerListIndicators");
    }
});
