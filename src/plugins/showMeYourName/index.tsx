/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { definePlugin, OptionType } from "../../utils/types";
import { RelationshipStore } from "../../webpack/common";

const settings = definePluginSettings({
    mode: {
        type: OptionType.SELECT,
        description: "Kullanıcı adı ve takma ad sırası",
        options: [
            { label: "Kullanıcı adı (takma ad)", value: "user-nick", default: true },
            { label: "Takma ad (kullanıcı adı)", value: "nick-user" },
            { label: "Yalnız kullanıcı adı", value: "user" }
        ]
    },
    displayNames: { type: OptionType.BOOLEAN, description: "Kullanıcı adı yerine görünen adı kullan", default: false }
});

export default definePlugin({
    name: "ShowMeYourName",
    description: "Mesajlarda kullanıcı adı ile sunucu takma adını birlikte gösterir",
    authors: [Devs.Berk],
    tags: ["görünüm", "mesaj"],
    settings,

    patches: [{
        find: '="SYSTEM_TAG"',
        reason: "Mesaj yazar adı doğrudan başlık bileşeninin inline children ifadesinde seçiliyor.",
        replacement: {
            match: /(?<=onContextMenu:\i,children:)\i\?(?=.{0,100}?user[Nn]ame:)/,
            replace: "$self.renderName(arguments[0]),_mcordOriginal:$&"
        }
    }],

    renderName(props: any) {
        const user = props?.userOverride ?? props?.message?.author;
        if (!user) return props?.author?.nick ?? null;
        const username = settings.store.displayNames ? (user.globalName || user.username) : user.username;
        const nick = RelationshipStore?.getNickname?.(user.id) || props?.author?.nick || username;
        if (settings.store.mode === "user" || nick?.toLowerCase?.() === username?.toLowerCase?.()) return username;
        const first = settings.store.mode === "nick-user" ? nick : username;
        const second = settings.store.mode === "nick-user" ? username : nick;
        return <>{first} <span style={{ color: "var(--text-muted)" }}>({second})</span></>;
    }
});
