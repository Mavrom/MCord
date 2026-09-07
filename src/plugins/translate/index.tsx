/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { type ContextMenuPatch } from "../../api/contextMenu";
import { updateMessage } from "../../api/messageUpdater";
import { nativeFetchJson } from "../../api/net";
import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { Logger } from "../../utils/logger";
import { definePlugin, OptionType } from "../../utils/types";
import { ChannelStore } from "../../webpack/common";

const logger = new Logger("Translate", "#f4b8e4");
const translated = new Map<string, { text: string; source: string }>();
const settings = definePluginSettings({
    receivedTarget: { type: OptionType.STRING, description: "Gelen mesaj hedef dili (ör. tr, en, de)", default: "tr" },
    sentTarget: { type: OptionType.STRING, description: "Gönderilen mesaj hedef dili", default: "en" },
    autoTranslateSent: { type: OptionType.BOOLEAN, description: "Gönderilen mesajları otomatik çevir", default: false }
});

async function translate(text: string, target: string): Promise<{ text: string; source: string }> {
    const query = new URLSearchParams({ client: "gtx", sl: "auto", tl: target, dt: "t", q: text });
    // Discord CSP `translate.googleapis.com`'a izin vermiyor — main process üzerinden.
    const data = await nativeFetchJson<any>(`https://translate.googleapis.com/translate_a/single?${query}`);
    return { text: data?.[0]?.map((part: any[]) => part?.[0] ?? "").join("") ?? text, source: data?.[2] ?? "auto" };
}

async function translateMessage(message: any): Promise<void> {
    if (!message?.content || !message?.id) return;
    try {
        translated.set(message.id, await translate(message.content, settings.store.receivedTarget));
        updateMessage(message.channel_id, message.id);
    } catch (error) {
        logger.warn("Mesaj çevrilemedi.", error);
    }
}

const menu: ContextMenuPatch = (children, props) => {
    if (!props?.message?.content) return;
    children.push({ type: "mcord-translate", id: "mcord-translate", label: "Mesajı çevir", action: () => void translateMessage(props.message) });
};

function TranslateIcon() {
    return <svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M12.9 15.1 10.8 13l.1-.1A14.7 14.7 0 0 0 14 7H16V5h-7V3H7v2H2v2h10a12.5 12.5 0 0 1-2.5 4.5A12 12 0 0 1 7.7 9H5.6a14 14 0 0 0 2.6 4L4 17.2 5.4 19l4.1-4.1 2.5 2.5.9-2.3ZM18.5 11h-2L12 23h2l1.1-3h4.8l1.1 3h2l-4.5-12Zm-2.6 7 1.6-4.3 1.6 4.3h-3.2Z" /></svg>;
}

export default definePlugin({
    name: "Translate",
    description: "Mesajları Google Translate ile çevirir ve isteğe bağlı olarak gönderileni çevrilmiş yollar",
    authors: [Devs.Berk],
    tags: ["mesaj", "çeviri"],
    dependencies: ["ContextMenuAPI", "MessageAccessoriesAPI", "MessagePopoverAPI", "MessageUpdaterAPI"],
    settings,
    contextMenus: { message: menu },
    messageAccessoryPosition: -1,

    messagePopoverButton(message: any) {
        if (!message?.content) return null;
        return {
            label: "Mesajı çevir",
            icon: TranslateIcon,
            message,
            channel: ChannelStore?.getChannel?.(message.channel_id),
            onClick: () => void translateMessage(message)
        };
    },

    renderMessageAccessory(props: Record<string, any>) {
        const value = translated.get(props?.message?.id);
        return value ? <div style={{ marginTop: 4, color: "var(--text-normal)" }}>{value.text} <small style={{ color: "var(--text-muted)" }}>({value.source})</small></div> : null;
    },

    async onBeforeMessageSend(_channelId: string, message: any) {
        if (!settings.store.autoTranslateSent || !message?.content) return;
        try {
            message.content = (await translate(message.content, settings.store.sentTarget)).text;
        } catch (error) {
            logger.warn("Gönderilecek mesaj çevrilemedi; özgün metin gönderilecek.", error);
        }
    },

    stop() {
        translated.clear();
    }
});
