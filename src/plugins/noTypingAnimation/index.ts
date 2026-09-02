/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "NoTypingAnimation",
    description: "Yazıyor göstergesindeki hareketli üç nokta animasyonunu durdurur",
    authors: [Devs.Berk],
    tags: ["performans", "görünüm"],

    patches: [{
        find: "dotCycle",
        reason: "Yazıyor noktalarının animasyonu odak props'una göre bileşen fabrikasında başlatılıyor.",
        replacement: {
            match: /focused:(\i)/g,
            replace: "focused_mcord:$1=false"
        }
    }]
});
