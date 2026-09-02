/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { type Command } from "../../api/commands";
import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";
import { findByKeys } from "../../webpack/finder";

interface FriendInvite {
    code: string;
    expires_at: string;
    max_uses: number;
    uses: number;
}

interface FriendInviteActions {
    createFriendInvite(): Promise<FriendInvite>;
    getAllFriendInvites(): Promise<FriendInvite[]>;
    revokeFriendInvites(): Promise<void>;
}

function actions(): FriendInviteActions {
    const module = findByKeys<FriendInviteActions>("createFriendInvite", "getAllFriendInvites", "revokeFriendInvites");
    if (!module) throw new Error("Arkadaş daveti modülü bulunamadı");
    return module;
}

const commands: Command[] = [
    {
        name: "friend-invite-create",
        description: "Yeni arkadaş daveti bağlantısı oluşturur",
        execute: async () => {
            const invite = await actions().createFriendInvite();
            const expires = Math.round(new Date(invite.expires_at).getTime() / 1000);
            return { content: `discord.gg/${invite.code} · Bitiş: <t:${expires}:R> · Azami kullanım: ${invite.max_uses}` };
        }
    },
    {
        name: "friend-invite-view",
        description: "Etkin arkadaş davetlerini listeler",
        execute: async () => {
            const invites = await actions().getAllFriendInvites();
            return {
                content: invites.length
                    ? invites.map(invite => `discord.gg/${invite.code} · ${invite.uses}/${invite.max_uses}`).join("\n")
                    : "Etkin arkadaş davetin yok."
            };
        }
    },
    {
        name: "friend-invite-revoke",
        description: "Tüm arkadaş davetlerini iptal eder",
        execute: async () => {
            await actions().revokeFriendInvites();
            return { content: "Tüm arkadaş davetleri iptal edildi." };
        }
    }
];

export default definePlugin({
    name: "FriendInvites",
    description: "Eğik çizgi komutlarıyla arkadaş davetlerini oluşturur ve yönetir",
    authors: [Devs.Berk],
    tags: ["arkadaşlar", "komut"],
    dependencies: ["CommandsAPI"],
    commands
});
