/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { definePlugin, OptionType } from "../../utils/types";
import { UserStore } from "../../webpack/common";

const settings = definePluginSettings({
    ignoreBots: { type: OptionType.BOOLEAN, description: "Bot mesajlarını yok say", default: true },
    volume: { type: OptionType.SLIDER, description: "Ses seviyesi", markers: [0, 0.25, 0.5, 0.75, 1], default: 0.5, stickToMarkers: false }
});

const MOYAI = /🗿|:moyai:|:moai:/gu;

/** Kısa bir "tak" sesi sentezler — harici ses dosyası bağımlılığı yok. */
function thud(volume: number): void {
    try {
        const Ctx = window.AudioContext ?? (window as any).webkitAudioContext;
        const ctx = new Ctx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + 0.18);
        gain.gain.setValueAtTime(Math.max(0.0001, volume), ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.22);
        osc.onended = () => ctx.close();
    } catch { /* ses bağlamı yok */ }
}

export default definePlugin({
    name: "Moyai",
    description: "İçinde 🗿 geçen her mesajda kısa bir ses çalar",
    authors: [Devs.Berk],
    tags: ["eglence"],
    settings,

    flux: {
        MESSAGE_CREATE({ message, optimistic }: any) {
            if (optimistic || !message?.content) return;
            if (settings.store.ignoreBots && message.author?.bot) return;
            if (message.author?.id === UserStore?.getCurrentUser?.()?.id) return;

            const count = (message.content.match(MOYAI) ?? []).length;
            for (let i = 0; i < Math.min(count, 5); i++) {
                setTimeout(() => thud(settings.store.volume), i * 300);
            }
        }
    }
});
