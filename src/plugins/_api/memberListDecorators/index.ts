/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { __getDecorators } from "../../../api/memberListDecorators";
import { Devs } from "../../../utils/constants";
import { definePlugin } from "../../../utils/types";
import { memberListDecoratorsStyle } from "./style";

/**
 * Kanıtlanmış açık-kaynak istemcinin (Vencord) güncel `MemberListDecoratorsAPI`
 * patch'lerinin birebir portu — hem sunucu üye listesi hem DM listesi.
 */
export default definePlugin({
    name: "MemberListDecoratorsAPI",
    description: "Plugin'lerin üye listesinde (sunucu ve DM) isimlerin yanına eleman eklemesini sağlar",
    authors: [Devs.MCord],
    required: true,

    managedStyle: memberListDecoratorsStyle,

    patches: [
        {
            find: "#{intl::GUILD_OWNER}),children:",
            reason: "Sunucu üye listesi satırı. Vencord MemberListDecoratorsAPI portu.",
            replacement: [
                {
                    match: /children:\[(?=.{0,300},lostPermissionTooltipText:)/,
                    replace: "children:[$self.__getDecorators(arguments[0],'guild'),"
                }
            ]
        },
        {
            find: "PrivateChannel.renderAvatar",
            reason: "DM listesi satırı. Vencord MemberListDecoratorsAPI portu.",
            replacement: {
                match: /decorators:(\i\.isSystemDM\(\)\?.+?:null)/,
                replace: "decorators:[$self.__getDecorators(arguments[0],'dm'),$1]"
            }
        }
    ],

    __getDecorators
});
