/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { Logger } from "../../utils/logger";
import { definePlugin } from "../../utils/types";
import { findByKeys } from "../../webpack/finder";
import { React } from "../../webpack/react";

const logger = new Logger("SpotifyControls", "#1db954");

function spotifyModule(): any {
    return findByKeys<any>("getPlayerState", "getTrack");
}

async function control(path: string, method = "POST"): Promise<void> {
    const socket = findByKeys<any>("getActiveSocketAndDevice")?.getActiveSocketAndDevice?.()?.socket;
    if (!socket?.accessToken) return;
    try {
        await fetch(`https://api.spotify.com/v1/me/player${path}`, {
            method,
            headers: { Authorization: `Bearer ${socket.accessToken}` }
        });
    } catch (error) {
        logger.warn("Spotify komutu gönderilemedi.", error);
    }
}

function Controls() {
    const spotify = spotifyModule();
    const read = () => ({ track: spotify?.getTrack?.(), state: spotify?.getPlayerState?.() });
    const [value, setValue] = React.useState(read);
    React.useEffect(() => {
        const timer = window.setInterval(() => setValue(read()), 1000);
        return () => window.clearInterval(timer);
    }, []);
    if (!value.track) return null;
    const playing = value.state?.isPlaying ?? value.state?.playing ?? false;
    const button = (label: string, action: () => void, text: string) => <button type="button" title={label} onClick={action} style={{ all: "unset", cursor: "pointer", padding: "0 3px" }}>{text}</button>;
    return <span title={value.track.name} style={{ display: "inline-flex", alignItems: "center", color: "#1db954", fontSize: 12 }}>
        {button("Önceki", () => void control("/previous"), "◀")}
        {button(playing ? "Duraklat" : "Oynat", () => void control(playing ? "/pause" : "/play", "PUT"), playing ? "Ⅱ" : "▶")}
        {button("Sonraki", () => void control("/next"), "▶|")}
    </span>;
}

export default definePlugin({
    name: "SpotifyControls",
    description: "Sohbet çubuğuna Spotify önceki, oynat/duraklat ve sonraki denetimleri ekler",
    authors: [Devs.Berk],
    tags: ["spotify", "medya"],
    dependencies: ["ChatComponentsAPI"],
    requiresRestart: false,
    chatBarButton: () => <Controls />
});
