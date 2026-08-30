/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Logger } from "../utils/logger";
import { getFluxDispatcher, MessageStore } from "../webpack/common";

const logger = new Logger("Api:MessageUpdater", "#f4b8e4");

/**
 * Bir mesajı yeniden render etmeye zorlar.
 *
 * Kod patch'i yok: Discord'un `MessageStore`'u `MESSAGE_UPDATE` flux olayını
 * dinliyor ve `merge(mevcutKayıt, olay.message)` yapıp yeni bir kayıt üretiyor —
 * yeni referans, abone bileşenleri yeniden render ediyor. Biz de gerçek bir
 * geçidin (gateway) göndereceği gibi tam mesaj nesnesini `dispatch` ediyoruz.
 *
 * `fields` verilirse mevcut kaydın üzerine yazılır (örn. `{ content: "yeni" }`).
 * Verilmezse mesaj aynı içerikle ama yeni referansla yeniden render edilir.
 */
export function updateMessage(
    channelId: string,
    messageId: string,
    fields?: Record<string, any>
): void {
    try {
        const store = MessageStore as unknown as {
            getMessage?(channelId: string, messageId: string): any;
        } | null;

        const message = store?.getMessage?.(channelId, messageId);
        if (message == null) {
            logger.debug(`Mesaj önbellekte yok, atlanıyor (${channelId}/${messageId}).`);
            return;
        }

        // `MessageRecord` düz bir sınıf: alanlar (`id`, `channel_id`, `author`,
        // `content` …) doğrudan örnek üstünde, yani `{ ...message }` geçit
        // formatında tam bir kopya veriyor. Discord'un `MESSAGE_UPDATE` işleyicisi
        // bunu mevcut kayda `merge` edip yeni bir referans üretiyor → yeniden render.
        getFluxDispatcher().dispatch({
            type: "MESSAGE_UPDATE",
            message: { ...message, ...fields }
        });
    } catch (err) {
        logger.error(`Mesaj güncellenemedi (${channelId}/${messageId}):\n`, err);
    }
}
