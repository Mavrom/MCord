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

    const lines: string[] = [];
    if ((mode === "friends" || mode === "both") && friendCount > 0) lines.push(`${friendCount} çevrimiçi`);
    if ((mode === "servers" || mode === "both") && serverCount > 0) lines.push(`${serverCount} sunucu`);
    if (lines.length === 0) return null;

    return (
        <div
            style={{
                flex: "0 0 auto",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 1,
                margin: "2px 0 4px",
                padding: "0 4px",
                color: "var(--channels-default, var(--interactive-normal))",
                fontSize: 10,
                lineHeight: "12px",
                fontWeight: 600,
                textAlign: "center",
                whiteSpace: "nowrap"
            }}
        >
            {lines.map(line => <div key={line}>{line}</div>)}
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
    // Sol şerit ServerListAPI kod patch'iyle besleniyor; host bileşen memoize
    // olduğu için canlı toggle'da eleman görünmüyor — restart gerekiyor.
    requiresRestart: true,

    renderIndicator: () => <Indicator />,

    start() {
        addServerListElement("above", "ServerListIndicators", this.renderIndicator);
    },

    stop() {
        removeServerListElement("above", "ServerListIndicators");
    }
});
