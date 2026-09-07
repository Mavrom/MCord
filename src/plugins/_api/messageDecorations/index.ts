/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { renderMessageDecorations } from "../../../api/chatComponents";
import { Devs } from "../../../utils/constants";
import { McordCreateElement } from "../../../utils/jsx";
import { definePlugin } from "../../../utils/types";

const style = `
.mcord-message-decorations { display: inline-flex; align-items: center; gap: .25em; margin-left: .25em; vertical-align: top; }
`;

export default definePlugin({
    name: "MessageDecorationsAPI",
    description: "Plugin'lerin mesaj yazar adının yanına dekorasyon eklemesini sağlar",
    authors: [Devs.Berk],
    required: true,
    managedStyle: style,

    patches: [{
        find: "#{intl::GUILD_COMMUNICATION_DISABLED_ICON_TOOLTIP_BODY}",
        reason: "Mesaj yazar dekorasyonları başlık bileşeninin yerel children dizisinde oluşturuluyor.",
        replacement: {
            // Discord artık intl anahtarlarını hash'liyor — ham string bundle'da
            // yok, `#{intl::…}` işaretçisiyle canonicalize edilmeli (referans katalog ile aynı).
            match: /#{intl::GUILD_COMMUNICATION_DISABLED_BOTTOM_SHEET_TITLE}.+?renderPopout:.+?(?=\])/,
            replace: "$&,$self.render(arguments[0])"
        }
    }],

    render(props: Record<string, any>) {
        const decorations = renderMessageDecorations(props);
        return decorations.length
            ? McordCreateElement("span", { className: "mcord-message-decorations" }, ...decorations)
            : null;
    }
});
