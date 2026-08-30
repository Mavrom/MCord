/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { renderMemberListDecorators } from "../../../api/memberListDecorators";
import { Devs } from "../../../utils/constants";
import { definePlugin } from "../../../utils/types";

export default definePlugin({
    name: "MemberListDecoratorsAPI",
    description: "Plugin'lerin sunucu üye listesinde isimlerin yanına küçük eleman eklemesini sağlar",
    authors: [Devs.MCord],
    required: true,

    patches: [
        {
            find: ",ownerTooltipText:u,premiumSince:R,onClickPremiumGuildIcon",
            reason:
                "Üye listesi satırı `AvatarWithText` bileşenini kullanıyor ve `decorators` "
                + "prop'unu ismin hemen sağında render ediyor. Bu prop bir modül literali "
                + "içinde inline JSX olarak veriliyor (`decorators:(0,r.jsx)(SahipTacı,{...})`); "
                + "dışarıdan tutulabilir referansı yok, fonksiyon patch'i uygulanamıyor. "
                + "Çapa `,ownerTooltipText:u,premiumSince:R,onClickPremiumGuildIcon` — bundle'da "
                + "tek geçiyor.",
            replacement: {
                // `decorators` değerini Discord'un kendi elemanı + bizimkiler olacak
                // şekilde sarıyoruz. Desen yapısal: `decorators:` prop'unun değeri bir
                // `jsx(Bileşen,{user:<değişken>...})` çağrısı — prop eklenmesine,
                // jsx→jsxs değişimine, değişken adı değişimine karşı dayanıklı (7/7).
                match: /decorators:(\(0,\i\.\i\)\(\i,\{user:(\i)[,}][^}]*\}\))/,
                replace: "decorators:$self.render($1,{user:$2})"
            }
        }
    ],

    render(originalDecoration: any, props: Record<string, any>) {
        return renderMemberListDecorators(originalDecoration, props);
    }
});
