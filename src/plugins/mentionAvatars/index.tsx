/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { definePlugin, OptionType } from "../../utils/types";

const settings = definePluginSettings({
    showAtSymbol: { type: OptionType.BOOLEAN, description: "Kullanıcı adından önce @ göster", default: true }
});

const style = ".mcord-mention-avatar{width:1em!important;height:1em;border-radius:50%;vertical-align:middle;margin:0 4px 2px 2px}";

export default definePlugin({
    name: "MentionAvatars",
    description: "Kullanıcı bahsetmelerinin içine küçük avatar ekler",
    authors: [Devs.Berk],
    tags: ["görünüm", "bahsetme"],
    settings,
    managedStyle: style,

    patches: [{
        find: ".USER_MENTION)",
        reason: "Bahsetme metni kullanıcı nesnesiyle birlikte inline children alanında oluşturuluyor.",
        replacement: {
            match: /children:`@\$\{(\i\?\?\i)\}`(?<=\.useName\((\i)\).+?)/,
            replace: "children:$self.renderMention($2,$1)"
        }
    }],

    renderMention(user: any, username: string) {
        const label = `${settings.store.showAtSymbol ? "@" : ""}${username}`;
        if (!user) return label;
        const src = user.getAvatarURL?.(undefined, 16, true)
            ?? (user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=32` : null);
        return <>{src && <img className="mcord-mention-avatar" src={src} alt="" />}{label}</>;
    }
});
