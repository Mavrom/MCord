/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "VoiceDownload",
    description: "Sesli mesaj oynatıcısına indirme bağlantısı ekler",
    authors: [Devs.Berk],
    tags: ["ses", "medya"],

    patches: [{
        find: "VOICE_MESSAGES_PLAYBACK_RATE_LABEL",
        reason: "Sesli mesaj araçları oynatıcı bileşeninin inline children dizisinde oluşturuluyor.",
        replacement: {
            match: /(?<=onVolumeHide:\i\}\))/,
            replace: ",$self.renderDownload(arguments[0].src)"
        }
    }],

    renderDownload(src: string) {
        if (typeof src !== "string") return null;
        return <a href={src} target="_blank" rel="noreferrer" title="Sesli mesajı indir" onClick={event => event.stopPropagation()} style={{ color: "currentColor", display: "flex" }}>
            <svg width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M11 3h2v10.6l3.3-3.3 1.4 1.4-5 5a1 1 0 0 1-1.4 0l-5-5 1.4-1.4 3.3 3.3V3ZM3 20h18v2H3v-2Z" /></svg>
        </a>;
    }
});
