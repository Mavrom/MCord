/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { showNotification } from "../../api/notifications";
import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";
import { GuildStore, UserStore } from "../../webpack/common";

const localRemovals = new Set<string>();

export default definePlugin({
    name: "RelationshipNotifier",
    description: "Bir arkadaş, grup konuşması veya sunucu seni kaldırdığında bildirim gösterir",
    authors: [Devs.Berk],
    tags: ["arkadaşlar", "bildirim"],

    patches: [
        {
            find: "removeRelationship:(",
            reason: "Kullanıcının kendi arkadaş silme eylemini uzak silmeden ayırmak için ilişki işlemi öncesi işaret gerekir.",
            replacement: {
                match: /(removeRelationship:\((\i),\i,\i\)=>)/,
                replace: "$1($self.markLocal($2),0)||"
            }
        },
        {
            find: "async leaveGuild(",
            reason: "Kullanıcının kendi sunucudan ayrılmasını atılma bildiriminden ayırmak için guild kimliği işaretlenmelidir.",
            replacement: {
                match: /(leaveGuild\((\i)\)\{)/,
                replace: "$1$self.markLocal($2);"
            }
        }
    ],

    flux: {
        RELATIONSHIP_REMOVE(event: any) {
            const id = event?.relationship?.id ?? event?.id;
            if (!id || localRemovals.delete(id)) return;
            const user = UserStore?.getUser?.(id);
            showNotification({ title: "Arkadaşlık değişti", body: `${user?.globalName ?? user?.username ?? id} artık arkadaş listende değil.` });
        },
        GUILD_DELETE(event: any) {
            const id = event?.guild?.id ?? event?.guildId ?? event?.id;
            if (!id || event?.unavailable || localRemovals.delete(id)) return;
            const guild = GuildStore?.getGuild?.(id) ?? event?.guild;
            showNotification({ title: "Sunucu kaldırıldı", body: `${guild?.name ?? id} artık sunucu listende değil.` });
        }
    },

    markLocal(id: string): void {
        if (!id) return;
        localRemovals.add(id);
        window.setTimeout(() => localRemovals.delete(id), 30_000);
    },

    stop() {
        localRemovals.clear();
    }
});
