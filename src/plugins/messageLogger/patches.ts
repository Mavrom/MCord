/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import type { PatchDefinition, PatchReplacement } from "../../utils/types";

function deletion(event: "MESSAGE_DELETE" | "MESSAGE_DELETE_BULK"): PatchReplacement {
    return {
        match: new RegExp(String.raw`(${event}:function\((\i)\)\{)(?=let.{0,100}?(\i\.\i)\.getOrCreate)`),
        replace: (_match, header, data, owner) => `${header}{const mcCache=$self.handleDelete(${owner}.getOrCreate(${data}.channelId),${data});if(mcCache!=null){${owner}.commit(mcCache);return;}}`
    };
}

/** referans katalog incelenen MessageStore sınırlarına MCord'a ait uyarlama. */
export const messageLoggerPatches: PatchDefinition[] = [
    {
        find: '"MessageStore"',
        reason: "Silme olayı diğer Flux tüketicilerine ulaşmalı; yalnız MessageStore'un özel kanal önbelleğinden kaldırma adımı değiştiriliyor.",
        group: true,
        replacement: [deletion("MESSAGE_DELETE"), deletion("MESSAGE_DELETE_BULK")]
    },
    {
        find: '"MessageStore"',
        reason: "Önceki içerik MessageStore kaydı değiştirilmeden okunmalı; normal mesaj birleştirme işlemi aynen devam ediyor.",
        replacement: {
            match: /(MESSAGE_UPDATE:function\((\i)\).+?)\.update\((\i),/,
            replace: "$1.update($3,mcPrevious=>$self.recordEdit(mcPrevious,$2.message)).update($3,"
        }
    },
    {
        find: '"MessageStore"',
        reason: "Yukarı ok kısayolu yerelde saklanan, sunucudan silinmiş bir mesajı düzenlemeye çalışmamalı.",
        replacement: {
            match: /(getLastEditableMessage\(\i\)\{.{0,200}?\.find\((\i)=>)/,
            replace: "$1!$self.isDeletedMessage($2)&&"
        }
    },
    {
        find: "#{intl::MESSAGE_EDITED}",
        reason: "Discord'un düzenlendi etiketi yerel geçmiş penceresini açmalı; mesaj gönderme veya komut kaydı kullanılmıyor.",
        replacement: {
            match: /(isInline:!1,children:.{0,50}?)"span",\{(?=className:)/,
            replace: "$1$self.EditMarker,{message:arguments[0].message,"
        }
    },
    {
        find: "this.truncateTop",
        reason: "Başka bir kullanıcının nonce değeri mevcut mesaj kimliğiyle çakışıp yerel geçmişi sessizce değiştirmemeli.",
        replacement: {
            match: /(receiveMessage\((\i)\)\{)/,
            replace: "$1$self.normalizeNonce($2);"
        }
    }
];
