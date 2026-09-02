/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { type Command } from "../../api/commands";
import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";
import { findByKeys } from "../../webpack/finder";

interface Track { id?: string; album?: { id?: string }; artists?: Array<{ external_urls?: { spotify?: string } }> }

function track(): Track | null {
    return findByKeys<any>("getPlayerState", "getTrack")?.getTrack?.() ?? null;
}

function command(name: string, url: (value: Track) => string | undefined): Command {
    return {
        name: `spotify-${name}`,
        description: `Dinlenen Spotify ${name} bağlantısını paylaşır`,
        execute: () => {
            const current = track();
            const link = current && url(current);
            return { content: link ?? "Şu anda paylaşılabilecek bir Spotify parçası yok." };
        }
    };
}

const commands = [
    command("track", value => value.id ? `https://open.spotify.com/track/${value.id}` : undefined),
    command("album", value => value.album?.id ? `https://open.spotify.com/album/${value.album.id}` : undefined),
    command("artist", value => value.artists?.[0]?.external_urls?.spotify)
];

export default definePlugin({
    name: "SpotifyShareCommands",
    description: "Dinlenen Spotify parçası, albümü veya sanatçısını komutla paylaşır",
    authors: [Devs.Berk],
    tags: ["spotify", "komut"],
    dependencies: ["CommandsAPI"],
    commands
});
