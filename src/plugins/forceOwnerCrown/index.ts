/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";
import { GuildStore } from "../../webpack/common";

export default definePlugin({
    name: "ForceOwnerCrown",
    description: "Büyük sunucularda da sunucu sahibinin taç simgesini gösterir",
    authors: [Devs.Berk],
    tags: ["rol", "sunucu"],

    patches: [{
        find: "#{intl::GUILD_OWNER}),children:",
        reason: "Sahip tacı kararı kullanıcı dekoratörleri oluşturulurken yerel değişkende hesaplanıyor.",
        replacement: {
            match: /(?<=decorators:.{0,220}?isOwner:)\i/,
            replace: "$self.isOwner(arguments[0])"
        }
    }],

    isOwner(props: any): boolean {
        const userId = props?.user?.id;
        if (!userId || props?.channel?.type === 3) return Boolean(props?.isOwner);

        const guildId = props?.guildId ?? props?.channel?.guild_id;
        return GuildStore?.getGuild?.(guildId)?.ownerId === userId;
    }
});
