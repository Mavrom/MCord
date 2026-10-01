/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { buildMessagePopoverButtons } from "../../../api/messagePopover";
import { Devs } from "../../../utils/constants";
import { definePlugin } from "../../../utils/types";

export default definePlugin({
    name: "MessagePopoverAPI",
    description: "Plugin'lerin mesaj hover araç çubuğuna düğme eklemesini sağlar",
    authors: [Devs.Berk],
    required: true,

    patches: [{
        // Anahtar artık bağlam menüsü modülünde de geçiyor; `),children` yalnız
        // hover araç çubuğunun `aria-label`'ında (Vencord ile aynı).
        find: "#{intl::MESSAGE_UTILITIES_A11Y_LABEL}),children",
        reason: "Mesaj hover düğmeleri, dışarıdan erişilemeyen yerel bir children dizisinde oluşturuluyor.",
        replacement: {
            // Düğme bileşeni artık modül üyesi (`x.y`) olarak çağrılıyor: `(\i\.\i|\i)`
            // ikisini de kabul ediyor (Vencord ile aynı).
            match: /(?<=\]\}\)),(.{0,40}togglePopout:.+?\}\))\]\}\):null,(?<=\((\i\.\i|\i),\{label:.+?:null,(\i)\?\(0,\i\.jsxs?\)\(\i\.Fragment.+?message:(\i).+?)/,
            replace: (_match, reactionButton, ButtonComponent, showReaction, message) =>
                `]}):null,$self.build(${ButtonComponent},${message}),${showReaction}?${reactionButton}:null,`
        }
    }],

    build: buildMessagePopoverButtons
});
