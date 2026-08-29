/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { commands } from "../../../api/commands";
import { Devs } from "../../../utils/constants";
import { definePlugin } from "../../../utils/types";
import { findByKeys } from "../../../webpack/finder";

export default definePlugin({
    name: "CommandsAPI",
    description: "Plugin'lerin kendi eğik çizgi komutlarını kaydetmesini sağlar",
    authors: [Devs.MCord],
    required: true,

    /**
     * Discord'un yerleşik komut listesine bizimkileri ekliyoruz.
     * Fonksiyon patch'i: liste her sorgulandığında sonuca ekleniyor,
     * plugin durunca sarmalayıcı kalkıyor (plan §5.1, §6.5).
     */
    start() {
        const CommandsStore = findByKeys("getBuiltInCommands");
        if (!CommandsStore) {
            throw new Error("Komut deposu bulunamadı.");
        }

        this.patcher.after(CommandsStore, "getBuiltInCommands", (self, args, returnValue) => {
            if (!Array.isArray(returnValue)) return returnValue;
            return [...returnValue, ...commands];
        });
    }
});
