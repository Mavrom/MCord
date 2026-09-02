/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { type ContextMenuPatch } from "../../api/contextMenu";
import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

const engines = {
    Google: "https://lens.google.com/uploadbyurl?url=",
    Yandex: "https://yandex.com/images/search?rpt=imageview&url=",
    SauceNAO: "https://saucenao.com/search.php?url=",
    TinEye: "https://www.tineye.com/search?url="
};

const menu: ContextMenuPatch = (children, props) => {
    const source = props?.src ?? props?.itemHref ?? props?.itemSrc;
    if (typeof source !== "string" || !/^https?:/.test(source)) return;
    for (const [name, endpoint] of Object.entries(engines)) children.push({
        type: `mcord-image-search-${name}`,
        id: `mcord-image-search-${name.toLowerCase()}`,
        label: `Görseli ${name} ile ara`,
        action: () => window.open(endpoint + encodeURIComponent(source), "_blank", "noopener,noreferrer")
    });
};

export default definePlugin({
    name: "ReverseImageSearch",
    description: "Görsel menülerine Google Lens, Yandex, SauceNAO ve TinEye araması ekler",
    authors: [Devs.Berk],
    tags: ["medya", "arama"],
    dependencies: ["ContextMenuAPI"],
    requiresRestart: false,
    contextMenus: { message: menu, "image-context": menu }
});
