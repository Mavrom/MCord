/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { currentNotice, nextNotice } from "../../../api/notices";
import { Devs } from "../../../utils/constants";
import { definePlugin } from "../../../utils/types";

/**
 * Kanıtlanmış açık-kaynak istemcinin (Vencord) güncel `NoticesAPI`
 * patch'lerinin birebir portu — `NoticeStore`'u değiştiriyor.
 */
export default definePlugin({
    name: "NoticesAPI",
    description: "MCord notice'lerinin Discord tarafından otomatik kapatılmasını engeller",
    authors: [Devs.MCord],
    required: true,

    patches: [
        {
            find: '"NoticeStore"',
            reason: "MCord notice'i kuyruktayken Discord kendi notice'ini göstermesin + dismiss.",
            replacement: [
                {
                    match: /(?<=!1;)\i=null;(?=.{0,80}getPremiumSubscription\(\))/g,
                    replace: "if($self.currentNotice)return false;$&"
                },
                {
                    match: /(?<=,NOTICE_DISMISS:function\(\i\){)return null!=(\i)/,
                    replace: (m, notice) =>
                        `if(${notice}?.id=="McordNotice")return(${notice}=null,$self.nextNotice(),true);${m}`
                }
            ]
        }
    ],

    get currentNotice() {
        return currentNotice;
    },
    nextNotice
});
