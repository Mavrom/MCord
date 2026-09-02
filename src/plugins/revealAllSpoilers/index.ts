/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "RevealAllSpoilers",
    description: "Ctrl+tıklamayla mesajdaki, Ctrl+Shift+tıklamayla sohbetteki tüm spoilerları açar",
    authors: [Devs.Berk],
    tags: ["erişilebilirlik", "mesaj"],

    patches: [{
        find: ".removeObscurity,",
        reason: "Spoiler açma olayı yalnız derlenmiş removeObscurity işleyicisinde mevcut.",
        replacement: {
            match: /(?<=removeObscurity(?:",|=)(\i)=>\{)/,
            replace: (_match, event) => `$self.reveal(${event});`
        }
    }],

    reveal(event: MouseEvent): void {
        if (!event.ctrlKey) return;
        const root = event.shiftKey
            ? document.querySelector<HTMLElement>('[class*="messagesWrapper"]')
            : (event.target as HTMLElement | null)?.closest<HTMLElement>('[id^="message-content-"]')?.parentElement;
        if (!root) return;
        root.querySelectorAll<HTMLElement>('[class*="spoilerContent"][class*="hidden"]').forEach(element => element.click());
    }
});
