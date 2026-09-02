/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { Logger } from "../../utils/logger";
import { definePlugin } from "../../utils/types";
import { findByKeys } from "../../webpack/finder";
import { React } from "../../webpack/react";

const logger = new Logger("WhoReacted", "#f4b8e4");
const cache = new Map<string, any[]>();

async function load(message: any, emoji: any, type: number): Promise<any[]> {
    const emojiKey = `${emoji.name}${emoji.id ? `:${emoji.id}` : ""}`;
    const key = `${message.id}:${emojiKey}:${type}`;
    if (cache.has(key)) return cache.get(key)!;
    const rest = findByKeys<any>("get", "patch");
    const response = await rest?.get?.({
        url: `/channels/${message.channel_id}/messages/${message.id}/reactions/${encodeURIComponent(emojiKey)}`,
        query: { limit: 5, type }
    });
    const users = Array.isArray(response?.body) ? response.body : [];
    cache.set(key, users);
    return users;
}

function Users({ message, emoji, type }: { message: any; emoji: any; type: number }) {
    const [users, setUsers] = React.useState<any[]>([]);
    React.useEffect(() => {
        let alive = true;
        void load(message, emoji, type).then(value => alive && setUsers(value)).catch(error => logger.warn("Reaksiyon kullanıcıları alınamadı.", error));
        return () => { alive = false; };
    }, [message.id, emoji.id, emoji.name, type]);
    if (!users.length) return null;
    return <span style={{ display: "inline-flex", marginLeft: 4 }}>
        {users.slice(0, 5).map(user => {
            const src = user.avatar
                ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=32`
                : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(user.id) >> 22n) % 6}.png`;
            return <img key={user.id} src={src} title={user.global_name ?? user.username} alt="" width="16" height="16" style={{ borderRadius: "50%", marginLeft: -3 }} />;
        })}
    </span>;
}

export default definePlugin({
    name: "WhoReacted",
    description: "Her reaksiyonun yanında reaksiyon veren kullanıcıların avatarlarını gösterir",
    authors: [Devs.Berk],
    tags: ["reaksiyon", "görünüm"],

    patches: [{
        find: ",reactionRef:",
        reason: "Reaksiyon sayacı ve emoji bilgisi yalnız reaksiyon bileşeninin inline children dizisinde birlikte bulunuyor.",
        replacement: {
            match: /(\i)\?null:\(0,\i\.jsx\)\(\i\.\i,\{className:\i\.reactionCount,.*?}\),(?<=(emoji:\i,message:\i,type:\i).+?)/,
            replace: "$&$1?null:$self.renderUsers({$2}),"
        }
    }],

    renderUsers(props: { message: any; emoji: any; type: number }) {
        if ((props?.message?.reactions?.length ?? 0) > 10) return null;
        return <Users {...props} />;
    },

    stop() {
        cache.clear();
    }
});
