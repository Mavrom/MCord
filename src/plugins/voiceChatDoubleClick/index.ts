/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";
import { ChannelStore, SelectedChannelStore } from "../../webpack/common";

const clicks = new Map<string, ReturnType<typeof setTimeout>>();

export default definePlugin({
    name: "VoiceChatDoubleClick",
    description: "Ses ve sahne kanallarına tek tık yerine çift tıkla katılır",
    authors: [Devs.Berk],
    tags: ["ses", "kısayol"],

    patches: [
        {
            find: ".handleClickChat",
            reason: "Ses kanalı satırları React click olayı yerine kanal nesnesi alan özel bir onClick kullanıyor.",
            replacement: {
                match: /onClick:\(\)=>\{this\.handleClick\(\)/g,
                replace: "onClick:()=>{$self.schedule(()=>{this.handleClick()},this)"
            }
        },
        {
            find: 'className:"channelMention",children:[null!=',
            reason: "Sohbet içindeki ses kanalı bahsi tıklaması yalnız derlenmiş mention bileşeninde ayrıştırılabiliyor.",
            replacement: {
                match: /onClick:(\i)(?=,.{0,30}className:"channelMention".+?(\i)\.inContent)/,
                replace: (_match, handler, props) => `onClick:(event)=>$self.allowMentionClick(event,${props})&&${handler}()`
            }
        }
    ],

    allowMentionClick(event: MouseEvent, props: { channelId?: string }): boolean {
        const channel = props?.channelId ? ChannelStore?.getChannel?.(props.channelId) : null;
        return channel == null || ![2, 13].includes(channel.type) || event.detail >= 2;
    },

    schedule(callback: () => void, instance: any): void {
        const id = instance?.props?.channel?.id;
        if (typeof id !== "string" || SelectedChannelStore?.getVoiceChannelId?.() === id) {
            callback();
            return;
        }

        const previous = clicks.get(id);
        if (previous) {
            clearTimeout(previous);
            clicks.delete(id);
            callback();
            return;
        }

        clicks.set(id, setTimeout(() => clicks.delete(id), 500));
    },

    stop() {
        for (const timer of clicks.values()) clearTimeout(timer);
        clicks.clear();
    }
});
