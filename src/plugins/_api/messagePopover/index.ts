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
        find: "MESSAGE_UTILITIES_A11Y_LABEL",
        reason: "Mesaj hover düğmeleri, dışarıdan erişilemeyen yerel bir children dizisinde oluşturuluyor.",
        replacement: {
            match: /(?<=\]\}\)),(.{0,40}togglePopout:.+?\}\))\]\}\):null,(?<=\((\i),\{label:.+?:null,(\i)\?\(0,\i\.jsxs?\)\(\i\.Fragment.+?message:(\i).+?)/,
            replace: (_match, reactionButton, ButtonComponent, showReaction, message) =>
                `]}):null,$self.build(${ButtonComponent},${message}),${showReaction}?${reactionButton}:null,`
        }
    }],

    build: buildMessagePopoverButtons
});
