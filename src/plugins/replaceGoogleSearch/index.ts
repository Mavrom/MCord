/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { type ContextMenuPatch } from "../../api/contextMenu";
import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { definePlugin, OptionType } from "../../utils/types";

const ENGINES: Record<string, string> = {
    brave: "https://search.brave.com/search?q=",
    duckduckgo: "https://duckduckgo.com/?q=",
    github: "https://github.com/search?q=",
    google: "https://www.google.com/search?q=",
    wikipedia: "https://wikipedia.org/w/index.php?search="
};

const settings = definePluginSettings({
    engine: {
        type: OptionType.SELECT,
        description: "Seçili metin aramasında kullanılacak arama motoru",
        options: [
            { label: "DuckDuckGo", value: "duckduckgo", default: true },
            { label: "Google", value: "google" },
            { label: "Brave", value: "brave" },
            { label: "GitHub", value: "github" },
            { label: "Wikipedia", value: "wikipedia" }
        ]
    }
});

function replaceSearch(children: any[], selectedText: string): boolean {
    for (let index = 0; index < children.length; index++) {
        const child = children[index];
        if (child?.props?.id === "search-google") {
            const engine = settings.store.engine;
            children[index] = {
                type: "mcord-search-engine",
                id: "mcord-search-engine",
                label: `${engine} ile ara`,
                action: () => window.open(`${ENGINES[engine]}${encodeURIComponent(selectedText.trim())}`, "_blank")
            };
            return true;
        }

        const nested = child?.props?.children;
        if (Array.isArray(nested) && replaceSearch(nested, selectedText)) return true;
    }
    return false;
}

const patch: ContextMenuPatch = children => {
    const selectedText = document.getSelection()?.toString();
    if (selectedText) replaceSearch(children, selectedText);
};

export default definePlugin({
    name: "ReplaceGoogleSearch",
    description: "Seçili metin için Google menü öğesini seçtiğin arama motoruyla değiştirir",
    authors: [Devs.Berk],
    tags: ["arama", "kullanışlılık"],
    dependencies: ["ContextMenuAPI"],
    settings,
    requiresRestart: false,

    contextMenus: {
        message: patch
    }
});
