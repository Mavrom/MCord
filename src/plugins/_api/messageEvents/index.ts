/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { _handleClick, _handlePreEdit, _handlePreSend } from "../../../api/messageEvents";
import { Devs } from "../../../utils/constants";
import { definePlugin } from "../../../utils/types";

/**
 * Kanıtlanmış açık-kaynak istemcinin (Vencord) güncel `MessageEventsAPI`
 * patch'lerinin birebir portu.
 *
 * Eski MCord sürümü çalışma-anı fonksiyon patch'i + `waitFor` / `waitForStore`
 * kullanıyordu; bu Discord build'inde o finder'lar kırık olduğu için
 * mesaj olayları hiç iletilmiyordu. Vencord'un kod patch'leri finder'a bağlı
 * değil.
 */
export default definePlugin({
    name: "MessageEventsAPI",
    description: "Mesaj gönderme, düzenleme ve tıklama olaylarını plugin'lere açar",
    authors: [Devs.MCord],
    required: true,

    patches: [
        {
            find: "#{intl::EDIT_TEXTAREA_HELP}",
            reason: "Mesaj düzenleme öncesi kanca. Vencord MessageEventsAPI portu.",
            replacement: {
                match: /(?<=,channel:\i,message:\i\}\)\.then\().+?(?=\i\.content!==this\.props\.message\.content&&\i\((.+?)\)\})/,
                replace: (match, args) => "" +
                    `async ${match}` +
                    `if(await $self._handlePreEdit(${args}))` +
                    "return Promise.resolve({shouldClear:false,shouldRefocus:true});"
            }
        },
        {
            find: ".handleSendMessage,onResize:",
            reason: "Mesaj gönderme öncesi kanca. Vencord MessageEventsAPI portu.",
            replacement: {
                match: /(?<=channel:\i\}\)\.then\()(?:async )?(\i=>.+?let (\i)=\i\.\i\.parse\((\i),.+?\.getSendMessageOptions\(\{.+?\}\)?;)(?=.+?(\i)\.flags=)(?<=\)\(({.+?})\)\.then.+?)/,
                replace: (_m, restCode, parsedMessage, channel, options, props) => "async " + restCode +
                    `if(await $self._handlePreSend(${channel}.id,${parsedMessage},${options},${props}))` +
                    "return{shouldClear:false,shouldRefocus:true};"
            }
        },
        {
            find: '("interactionUsernameProfile',
            reason: "Mesaj tıklama olayı. Vencord MessageEventsAPI portu.",
            replacement: {
                match: /let\{id:\i}=(\i),{id:\i}=(\i);return \i\.useCallback\((\i)=>\{/,
                replace: (m, message, channel, event) =>
                    `const mcMsg=${message},mcChan=${channel};${m}$self._handleClick(mcMsg,mcChan,${event});`
            }
        }
    ],

    _handlePreSend,
    _handlePreEdit,
    _handleClick
});
