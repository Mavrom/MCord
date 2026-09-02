/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";
import { UserStore } from "../../webpack/common";
import { findByCodeLazy } from "../../webpack/lazy";

const UserMention = findByCodeLazy(".USER_MENTION)");

export default definePlugin({
    name: "FullUserInChatbox",
    description: "Sohbet kutusundaki kullanıcı bahsetmelerine profil ve bağlam menüsü davranışı kazandırır",
    authors: [Devs.Berk],
    tags: ["bahsetme", "kısayol"],

    patches: [{
        find: '"text":"locked"',
        reason: "Editör içindeki salt metin kullanıcı bahsetmesi yalnız Slate render fonksiyonunun içinde seçiliyor.",
        replacement: {
            match: /(hidePersonalInformation\).+?)(if\(null!=\i\){.+?return \i)(?=})/,
            replace: "$1return $self.renderUser({...arguments[0],original:()=>{$2}});"
        }
    }],

    renderUser(props: any) {
        const user = UserStore?.getUser?.(props?.id);
        if (!user || typeof UserMention !== "function") return props?.original?.();
        return <UserMention className="mention" userId={props.id} channelId={props.channelId} />;
    }
});
