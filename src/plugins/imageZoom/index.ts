/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { definePlugin, OptionType } from "../../utils/types";

const settings = definePluginSettings({
    zoomSpeed: { type: OptionType.NUMBER, description: "Fare tekeri başına yakınlaştırma yüzdesi", default: 10 },
    maxZoom: { type: OptionType.NUMBER, description: "Azami yakınlaştırma yüzdesi", default: 500 }
});

let active: HTMLImageElement | null = null;
let scale = 1;

function wheel(event: WheelEvent): void {
    const image = (event.target as HTMLElement | null)?.closest?.("img");
    if (!(image instanceof HTMLImageElement)) return;
    if (!event.ctrlKey) return;
    event.preventDefault();
    if (active && active !== image) active.style.transform = "";
    active = image;
    scale = Math.min(settings.store.maxZoom / 100, Math.max(1, scale + (event.deltaY < 0 ? 1 : -1) * settings.store.zoomSpeed / 100));
    image.style.transformOrigin = `${event.offsetX}px ${event.offsetY}px`;
    image.style.transform = `scale(${scale})`;
    image.style.zIndex = "10";
    image.style.position = "relative";
}

function reset(): void {
    if (!active) return;
    active.style.transform = "";
    active.style.zIndex = "";
    active.style.position = "";
    active = null;
    scale = 1;
}

export default definePlugin({
    name: "ImageZoom",
    description: "Ctrl+fare tekeriyle Discord görsellerini imleç çevresinde yakınlaştırır",
    authors: [Devs.Berk],
    tags: ["medya", "erişilebilirlik"],
    settings,
    requiresRestart: false,

    start() {
        document.addEventListener("wheel", wheel, { passive: false });
        document.addEventListener("click", reset);
    },

    stop() {
        document.removeEventListener("wheel", wheel);
        document.removeEventListener("click", reset);
        reset();
    }
});
