/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { type ContextMenuPatch } from "../../api/contextMenu";
import { Devs } from "../../utils/constants";
import { Logger } from "../../utils/logger";
import { definePlugin } from "../../utils/types";
import { find, findByKeys } from "../../webpack/finder";

const logger = new Logger("VoiceMessages", "#f4b8e4");

function chooseAudio(): Promise<File | null> {
    return new Promise(resolve => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "audio/ogg,audio/opus,.ogg,.opus";
        input.onchange = () => resolve(input.files?.[0] ?? null);
        input.click();
    });
}

async function metadata(file: File): Promise<{ duration: number; waveform: string }> {
    const context = new AudioContext();
    try {
        const audio = await context.decodeAudioData(await file.arrayBuffer());
        const samples = audio.getChannelData(0);
        const binCount = Math.max(1, Math.min(256, Math.floor(audio.duration * 10), samples.length));
        const bins = new Uint8Array(binCount);
        const perBin = Math.max(1, Math.floor(samples.length / binCount));

        for (let bin = 0; bin < binCount; bin++) {
            let energy = 0;
            const start = bin * perBin;
            const end = Math.min(samples.length, start + perBin);
            for (let index = start; index < end; index++) energy += samples[index] ** 2;
            bins[bin] = Math.min(255, Math.round(Math.sqrt(energy / Math.max(1, end - start)) * 255));
        }

        return {
            duration: Math.max(0.1, audio.duration),
            waveform: btoa(String.fromCharCode(...bins))
        };
    } finally {
        void context.close();
    }
}

async function sendVoiceMessage(channelId: string): Promise<void> {
    const file = await chooseAudio();
    if (!file) return;
    if (!/\.(ogg|opus)$/i.test(file.name) && !/ogg|opus/i.test(file.type)) {
        window.alert("Discord sesli mesajları için Ogg/Opus dosyası seçmelisin.");
        return;
    }

    try {
        const meta = await metadata(file);
        const CloudUpload = find<any>((value: any) =>
            typeof value === "function" && typeof value.prototype?.trackUploadFinished === "function",
        { silent: true });
        const rest = findByKeys<any>("get", "post", "patch");
        if (!CloudUpload || typeof rest?.post !== "function") {
            logger.warn("Discord yükleme modülü bulunamadı; sesli mesaj gönderilmedi.");
            return;
        }

        const upload = new CloudUpload({
            file: new File([file], "voice-message.ogg", { type: "audio/ogg; codecs=opus" }),
            isThumbnail: false,
            platform: 1
        }, channelId);

        upload.on("complete", () => {
            const nonce = String(Date.now());
            void rest.post({
                url: `/channels/${channelId}/messages`,
                body: {
                    flags: 1 << 13,
                    channel_id: channelId,
                    content: "",
                    nonce,
                    sticker_ids: [],
                    type: 0,
                    attachments: [{
                        id: "0",
                        filename: upload.filename ?? "voice-message.ogg",
                        uploaded_filename: upload.uploadedFilename,
                        waveform: meta.waveform,
                        duration_secs: meta.duration
                    }]
                }
            }).catch((error: unknown) => logger.warn("Sesli mesaj gönderilemedi.", error));
        });
        upload.on("error", (error: unknown) => logger.warn("Ses dosyası yüklenemedi.", error));
        upload.upload();
    } catch (error) {
        logger.warn("Sesli mesaj hazırlanamadı.", error);
    }
}

const menu: ContextMenuPatch = (children, props) => {
    const channelId = props?.channel?.id;
    if (!channelId) return;
    children.push({
        type: "mcord-send-voice-message",
        id: "mcord-send-voice-message",
        label: "Sesli mesaj gönder",
        action: () => void sendVoiceMessage(channelId)
    });
};

export default definePlugin({
    name: "VoiceMessages",
    description: "Dosya yükleme menüsünden Ogg/Opus ses dosyalarını Discord sesli mesajı olarak gönderir",
    authors: [Devs.Berk],
    tags: ["ses", "mesaj"],
    dependencies: ["ContextMenuAPI"],
    requiresRestart: false,
    contextMenus: { "channel-attach": menu }
});
