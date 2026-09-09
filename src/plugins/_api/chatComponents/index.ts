/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { renderChatBarButtons } from "../../../api/chatComponents";
import { Devs } from "../../../utils/constants";
import { Logger } from "../../../utils/logger";
import { definePlugin } from "../../../utils/types";

const logger = new Logger("ChatComponentsAPI", "#f4b8e4");

export default definePlugin({
    name: "ChatComponentsAPI",
    description: "Plugin'lerin sohbet çubuğuna düğme eklemesini sağlar",
    authors: [Devs.MCord],
    required: true,

    // Kanıtlanmış açık-kaynak istemcinin (Vencord) güncel `ChatInputButtonAPI`
    // patch'inin birebir portu.
    patches: [
        {
            find: '"sticker")',
            reason: "Sohbet girişi düğme dizisi. Vencord ChatInputButtonAPI portu.",
            replacement: {
                match: /0===(\i)\.length(?=.{0,25}?\(0,\i\.jsxs?\)\(.{0,75}?children:\1)/,
                replace: "($self.injectButtons($1,arguments[0]),$&)"
            }
        }
    ],

    /**
     * Kayıtlı düğmeleri Discord'un düğme dizisinin **sonuna** ekler.
     *
     * Patch'lenmiş kod her render'da çağırıyor; hata sızdırmamak kritik, aksi
     * halde sohbet girişi komple çöker.
     */
    injectButtons(buttons: unknown[], props: Record<string, any>): void {
        try {
            // Vencord `_injectButtons`: devre dışıysa veya Discord hiç düğme
            // render etmediyse (gerçek sohbet çubuğu değil) atla.
            if (!Array.isArray(buttons) || props?.disabled || buttons.length === 0) return;
            buttons.push(...renderChatBarButtons(props));
        } catch (err) {
            logger.error("Sohbet çubuğu düğmeleri eklenemedi:\n", err);
        }
    }
});
