/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin, StartAt } from "../../utils/types";
import { findStoreLazy, waitForStore } from "../../webpack/lazy";

/** Modul kapsaminda kayit: plugin kapaliyken de CI dogruluyor. */
findStoreLazy("SelfPresenceStore");

/** Discord'un `ActivityTypes.HANG_STATUS` değeri (sabit gateway sözleşmesi). */
const HANG_STATUS = 6;

/**
 * Discord güncel istemciden hang status ayarlayıcılarını (`setHangStatus`,
 * `clearHangStatus`) ve otomatik seçimi tamamen kaldırdı; build'de yalnız
 * başkalarının durumlarını süzen `HANG_STATUS` filtreleri kaldı. Vencord'daki
 * eski `noDefaultHangStatus` da aynı sebeple silindi, taşınacak bir karşılık yok.
 *
 * Özelliği koruyan en dar nokta: gateway'e giden kendi varlık bilgimiz.
 * `SelfPresenceStore.getLocalPresence()` bağlantının `PRESENCE_UPDATE`
 * gönderdiği tek kaynak; oradan `HANG_STATUS` tipindeki aktiviteleri
 * süzüyoruz. Discord bir gün otomatik hang status'u geri getirirse bile
 * başkalarına gitmiyor. Bugünkü build'de süzülecek bir şey olmadığı için
 * davranış değişmiyor.
 */
export default definePlugin({
    name: "NoDefaultHangStatus",
    description: "Yeni 'takılıyor' (hang) durumunun otomatik seçilmesini engeller",
    authors: [Devs.Berk],
    tags: ["gizlilik"],
    startAt: StartAt.WebpackReady,
    requiresRestart: false,

    cancel: undefined as (() => void) | undefined,

    start() {
        this.cancel = waitForStore("SelfPresenceStore", (store: any) => {
            if (typeof store?.getLocalPresence !== "function") return;

            this.patcher.after(store, "getLocalPresence", (_self, _args, presence) => {
                const activities = presence?.activities;
                if (!Array.isArray(activities)) return presence;

                const filtered = activities.filter((activity: any) => activity?.type !== HANG_STATUS);
                // Değişiklik yoksa aynı nesne: Discord'un "değişti mi"
                // karşılaştırması gereksiz yere presence göndermesin.
                return filtered.length === activities.length
                    ? presence
                    : { ...presence, activities: filtered };
            });
        });
    },

    stop() {
        this.cancel?.();
        this.cancel = undefined;
    }
});
