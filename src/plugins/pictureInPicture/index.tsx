/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import type { MouseEvent } from "react";

import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { definePlugin, OptionType } from "../../utils/types";

const settings = definePluginSettings({
    loop: {
        type: OptionType.BOOLEAN,
        description: "PiP videosunu döngüde oynat",
        default: true
    }
});

async function openPictureInPicture(event: MouseEvent<HTMLButtonElement>): Promise<void> {
    const container = event.currentTarget.parentElement?.parentElement;
    const source = container?.querySelector("video");
    if (!(source instanceof HTMLVideoElement)) return;

    const clone = source.cloneNode(true) as HTMLVideoElement;
    clone.loop = settings.store.loop;
    clone.style.display = "none";
    document.body.appendChild(clone);

    const cleanup = () => {
        clone.pause();
        clone.removeAttribute("src");
        clone.load();
        clone.remove();
    };

    clone.addEventListener("leavepictureinpicture", cleanup, { once: true });
    try {
        clone.currentTime = source.currentTime;
        source.pause();
        await clone.play();
        await clone.requestPictureInPicture();
    } catch {
        cleanup();
        void source.play().catch(() => undefined);
    }
}

export default definePlugin({
    name: "PictureInPicture",
    description: "Video araçlarına pencere içinde pencere düğmesi ekler",
    authors: [Devs.Berk],
    tags: ["medya", "video"],
    settings,

    patches: [{
        find: '["VIDEO","CLIP","AUDIO"]',
        reason: "Medya araç düğmeleri, ek bileşen kancası olmayan yerel children dizisinde oluşturuluyor.",
        replacement: {
            match: /(\[\i>0&&\i\.length>0.{0,150}?children:)(\i\.slice\(\i\))(?<=showDownload:(\i).+?isVisualMediaType:(\i).+?)/,
            replace: (_match, prefix, children, showDownload, isVisual) => `${prefix}[${showDownload}&&${isVisual}&&$self.renderButton(),...${children}]`
        }
    }],

    renderButton() {
        return (
            <button
                aria-label="Pencere içinde pencere"
                onClick={event => void openPictureInPicture(event)}
                style={{ all: "unset", cursor: "pointer", padding: 4, display: "flex" }}
            >
                <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="M3 3h18a1 1 0 0 1 1 1v7h-2V5H4v14h6v2H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm10 10h8a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1Zm1 2v4h6v-4h-6Z" />
                </svg>
            </button>
        );
    }
});
