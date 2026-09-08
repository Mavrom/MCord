/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { definePlugin, OptionType } from "../../utils/types";

const settings = definePluginSettings({
    lightness: { type: OptionType.NUMBER, description: "Üretilen renklerin açıklık yüzdesi", default: 70 },
    memberListColors: { type: OptionType.BOOLEAN, description: "Üye listesinde de benzersiz renk kullan", default: true },
    onlyWithoutRoleColor: { type: OptionType.BOOLEAN, description: "Yalnız rol rengi olmayan kullanıcılara uygula", default: false },
    onlyDMs: { type: OptionType.BOOLEAN, description: "Yalnız özel mesajlarda uygula", default: false }
});

function colorFor(id: string | undefined): string | undefined {
    if (!id) return undefined;
    let hash = 2166136261;
    for (let index = 0; index < id.length; index++) {
        hash ^= id.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return `hsl(${(hash >>> 0) % 360} 100% ${settings.store.lightness}%)`;
}

export default definePlugin({
    name: "IrcColors",
    description: "IRC istemcilerindeki gibi kullanıcılara kimliğinden sabit ve benzersiz ad rengi verir",
    authors: [Devs.Berk],
    tags: ["görünüm", "renk"],
    settings,

    patches: [
        {
            find: '="SYSTEM_TAG"',
            reason: "Mesaj yazarının rol rengi, kullanıcı ve kanal bağlamıyla birlikte inline props nesnesinde hesaplanıyor.",
            replacement: {
                match: /(?<=colorString:\i,colorStrings:\i,colorRoleName:\i.*?}=)(\i),/,
                replace: "$self.messageColors($1,arguments[0]),"
            }
        },
        {
            find: "#{intl::GUILD_OWNER}),children:",
            reason: "Üye listesindeki ad rengi yalnız satır bileşeninin yerel props nesnesinden değiştirilebiliyor.",
            predicate: () => settings.store.memberListColors,
            replacement: {
                match: /(?<=roleName:\i,)colorString:/,
                replace: "colorString:$self.listColor(arguments[0]),originalColor:"
            }
        }
    ],

    messageColors(original: { colorString?: string; colorStrings?: Record<string, string> }, context: any) {
        const current = original?.colorString;
        if (settings.store.onlyDMs && !context?.channel?.isPrivate?.()) return original;
        if (settings.store.onlyWithoutRoleColor && current) return original;
        const color = colorFor(context?.message?.author?.id);
        return color ? { ...original, colorString: color, colorStrings: undefined } : original;
    },

    listColor(context: any): string | undefined {
        const current = context?.colorString;
        if (settings.store.onlyDMs && context?.guildId != null) return current;
        if (settings.store.onlyWithoutRoleColor && current) return current;
        return colorFor(context?.user?.id) ?? current;
    }
});
