/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { type Command } from "../../api/commands";
import { getTraceSummary } from "../../debug/tracer";
import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

const command: Command = {
    name: "startup-timings",
    description: "MCord başlangıç aşamalarının sürelerini gösterir",
    execute: () => {
        const traces = getTraceSummary().filter(trace => trace.totalTime >= 0);
        if (!traces.length) {
            return { content: "Başlangıç izleri yalnızca geliştirme derlemesinde toplanıyor." };
        }
        const total = traces.reduce((sum, trace) => sum + trace.totalTime, 0);
        return {
            content: [
                `MCord başlangıç toplamı: ${total.toFixed(2)} ms`,
                ...traces.map(trace => `${trace.name}: ${trace.totalTime.toFixed(2)} ms`)
            ].join("\n")
        };
    }
};

export default definePlugin({
    name: "StartupTimings",
    description: "MCord başlangıç ölçümlerini /startup-timings komutuyla raporlar",
    authors: [Devs.Berk],
    tags: ["geliştirici", "performans"],
    dependencies: ["CommandsAPI"],
    commands: [command]
});
