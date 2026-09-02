/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { type ContextMenuPatch } from "../../api/contextMenu";
import { Devs } from "../../utils/constants";
import { Logger } from "../../utils/logger";
import { definePlugin } from "../../utils/types";
import { ChannelStore, MessageActions } from "../../webpack/common";

const logger = new Logger("GreetStickerPicker", "#f4b8e4");
let welcomeStickers: any[] = [];

function stickerLabel(sticker: any): string {
    const description = String(sticker?.description ?? "Karşılama çıkartması").trim();
    return description.split(/\s+/)[0] || "Karşılama çıkartması";
}

function sendGreet(channel: any, message: any, stickerId: string): void {
    const send = MessageActions?.sendGreetMessage;
    if (typeof send !== "function") {
        logger.warn("Discord karşılama gönderme işlevi bulunamadı; çıkartma gönderilmedi.");
        return;
    }

    try {
        const options = MessageActions?.getSendMessageOptionsForReply?.({
            channel,
            message,
            shouldMention: true,
            showMentionToggle: true
        });
        send(channel.id, stickerId, options);
    } catch (error) {
        logger.warn("Karşılama çıkartması gönderilemedi.", error);
    }
}

const messageMenu: ContextMenuPatch = (children, props) => {
    const message = props?.message;
    if (message?.type !== 7 || !welcomeStickers.length) return;

    const channel = props?.channel ?? ChannelStore?.getChannel?.(message.channel_id);
    if (!channel) return;

    children.push({
        type: "mcord-greet-sticker-picker",
        id: "mcord-greet-sticker-picker",
        label: "Karşılama çıkartması gönder",
        children: welcomeStickers.map(sticker => ({
            type: "mcord-greet-sticker",
            id: `mcord-greet-${sticker.id}`,
            label: stickerLabel(sticker),
            action: () => sendGreet(channel, message, sticker.id)
        }))
    });
};

export default definePlugin({
    name: "GreetStickerPicker",
    description: "Katılım mesajında rastgele seçim yerine istediğin karşılama çıkartmasını gönderir",
    authors: [Devs.Berk],
    tags: ["çıkartma", "sunucu"],
    dependencies: ["ContextMenuAPI"],
    contextMenus: { message: messageMenu },

    patches: [{
        find: "Wumpus waves hello",
        reason: "Discord karşılama çıkartması listesini dışarı açmadığı için yerleşik sabit yüklenirken yakalanıyor.",
        replacement: {
            match: /(?<=(?:const|let|var) \i=)(\[\{id:"749054660769218631",format_type:\d,description:"Wumpus waves hello"[^;]+?\])(?=;)/,
            replace: "$self.setWelcomeStickers($1)"
        }
    }],

    setWelcomeStickers(stickers: any[]) {
        if (Array.isArray(stickers)) welcomeStickers = stickers;
        return stickers;
    },

    stop() {
        welcomeStickers = [];
    }
});
