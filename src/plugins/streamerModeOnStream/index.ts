/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";
import { getFluxDispatcher, UserStore } from "../../webpack/common";

function setStreamerMode(event: any, enabled: boolean): void {
    const ownId = UserStore?.getCurrentUser?.()?.id;
    if (!ownId || !event?.streamKey?.endsWith?.(ownId)) return;
    getFluxDispatcher()?.dispatch?.({ type: "STREAMER_MODE_UPDATE", key: "enabled", value: enabled });
}

export default definePlugin({
    name: "StreamerModeOnStream",
    description: "Discord'da yayın başlatınca yayıncı modunu otomatik açar, bitince kapatır",
    authors: [Devs.Berk],
    tags: ["gizlilik", "yayın"],
    requiresRestart: false,

    flux: {
        STREAM_CREATE: event => setStreamerMode(event, true),
        STREAM_DELETE: event => setStreamerMode(event, false)
    }
});
