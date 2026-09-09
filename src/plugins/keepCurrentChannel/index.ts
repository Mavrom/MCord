/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { Logger } from "../../utils/logger";
import { definePlugin, StartAt } from "../../utils/types";
import { NavigationRouter, SelectedChannelStore } from "../../webpack/common";


const logger = new Logger("KeepCurrentChannel", "#a6d189");
const KEY = "mcord-last-channel";

export default definePlugin({
    name: "KeepCurrentChannel",
    description: "Discord'u yeniden başlattığında en son açık olduğun kanala geri döner",
    authors: [Devs.Berk],
    tags: ["kalite-yasam"],
    startAt: StartAt.ConnectionOpen,

    flux: {
        CHANNEL_SELECT({ channelId, guildId }: any) {
            if (!channelId) return;
            try { localStorage.setItem(KEY, JSON.stringify({ channelId, guildId })); } catch { /* kota */ }
        }
    },

    start() {
        let saved: { channelId: string; guildId?: string } | null = null;
        try { saved = JSON.parse(localStorage.getItem(KEY) ?? "null"); } catch { /* bozuk */ }
        if (!saved?.channelId) return;
        if (SelectedChannelStore?.getChannelId?.() === saved.channelId) return;

        try {
            // NavigationRouter zaten dogrulanmis bir mangled modul (common.ts);
            // eager findByKeys yerine onu kullaniyoruz.
            if (saved.guildId) (NavigationRouter as any)?.transitionToGuild?.(saved.guildId, saved.channelId);
            else (NavigationRouter as any)?.transitionTo?.(`/channels/@me/${saved.channelId}`);
        } catch (err) {
            logger.warn("Kanala dönülemedi:", err);
        }
    }
});
