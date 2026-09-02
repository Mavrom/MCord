/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { definePlugin, OptionType } from "../../utils/types";

const DISCORD_EPOCH = 1420070400000;
const settings = definePluginSettings({
    latency: { type: OptionType.NUMBER, description: "Gösterge için saniye eşiği", default: 2 },
    showMillis: { type: OptionType.BOOLEAN, description: "Gecikmeyi milisaniye olarak göster", default: false }
});

function timestamp(id: string): number | null {
    try {
        return Number(BigInt(id) >> 22n) + DISCORD_EPOCH;
    } catch {
        return null;
    }
}

export default definePlugin({
    name: "MessageLatency",
    description: "Gönderilmesi belirlenen eşikten uzun süren mesajlara gecikme göstergesi ekler",
    authors: [Devs.Berk],
    tags: ["mesaj", "yardımcı"],
    settings,

    patches: [{
        find: "showCommunicationDisabledStyles",
        reason: "Mesaj başlığındaki kullanıcı adı aksesuarları ek kanca olmadan inline children dizisinde oluşturuluyor.",
        replacement: {
            match: /(message:(\i),avatar:\i,username:\(0,\i\.jsxs\)\(\i.Fragment,\{children:\[)(\i&&)/,
            replace: "$1$self.renderLatency($2),$3"
        }
    }],

    renderLatency(message: any) {
        if (typeof message?.id !== "string" || typeof message?.nonce !== "string" || message?.author?.bot) return null;
        const sent = timestamp(message.nonce);
        const received = timestamp(message.id);
        if (sent == null || received == null) return null;
        const delta = Math.abs(received - sent);
        if (delta < settings.store.latency * 1000) return null;
        const label = settings.store.showMillis ? `${delta} ms` : `${Math.round(delta / 1000)} sn`;
        return (
            <span title={`Mesaj gecikmesi: ${label}`} aria-label={`Mesaj gecikmesi ${label}`} style={{ color: "var(--status-warning)", marginRight: 6 }}>
                ◔
            </span>
        );
    }
});
