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

const logger = new Logger("MessageLinkEmbeds", "#f4b8e4");
const link = /https?:\/\/(?:\w+\.)?discord(?:app)?\.com\/channels\/(?:\d{17,20}|@me)\/(\d{17,20})\/(\d{17,20})/;
const cache = new Map<string, any>();

async function fetchMessage(channelId: string, messageId: string): Promise<any> {
    const key = `${channelId}:${messageId}`;
    if (cache.has(key)) return cache.get(key);
    const rest = findByKeys<any>("get", "patch");
    const response = await rest?.get?.({ url: `/channels/${channelId}/messages`, query: { limit: 1, around: messageId } });
    const message = response?.body?.find?.((entry: any) => entry.id === messageId) ?? null;
    cache.set(key, message);
    return message;
}

function Embed({ content }: { content: string }) {
    const match = content.match(link);
    const [message, setMessage] = React.useState<any>(null);
    React.useEffect(() => {
        let alive = true;
        if (match) void fetchMessage(match[1], match[2]).then(value => alive && setMessage(value)).catch(error => logger.warn("Bağlı mesaj alınamadı.", error));
        return () => { alive = false; };
    }, [match?.[1], match?.[2]]);
    if (!message) return null;
    return <blockquote style={{ margin: "6px 0", padding: "8px 10px", borderLeft: "4px solid var(--brand-500)", background: "var(--background-secondary)" }}>
        <strong>{message.author?.global_name ?? message.author?.username ?? "Kullanıcı"}</strong>
        <div>{message.content || "(yalnız ek içerik)"}</div>
    </blockquote>;
}

export default definePlugin({
    name: "MessageLinkEmbeds",
    description: "Discord mesaj bağlantılarının altına bağlı mesajın kısa önizlemesini ekler",
    authors: [Devs.Berk],
    tags: ["mesaj", "görünüm"],
    dependencies: ["MessageAccessoriesAPI"],
    messageAccessoryPosition: 4,

    renderMessageAccessory(props: Record<string, any>) {
        const content = props?.message?.content;
        return typeof content === "string" && link.test(content) ? <Embed content={content} /> : null;
    },

    stop() {
        cache.clear();
    }
});
