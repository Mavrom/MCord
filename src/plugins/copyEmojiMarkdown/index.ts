/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { type ContextMenuPatch } from "../../api/contextMenu";
import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { Logger } from "../../utils/logger";
import { definePlugin, OptionType } from "../../utils/types";
import { findByKeys } from "../../webpack/finder";
import { formatEmojiMarkdown } from "./format";

const logger = new Logger("CopyEmojiMarkdown", "#f4b8e4");

const settings = definePluginSettings({
    copyUnicode: {
        type: OptionType.BOOLEAN,
        description: "Varsayılan emojileri :ad: yerine Unicode karakteri olarak kopyala",
        default: true
    }
});

function resolveUnicode(target: HTMLElement, name: string): string | undefined {
    const alt = target.querySelector("img")?.alt;
    if (alt && !alt.startsWith(":")) return alt;

    const converter = findByKeys<{ convertNameToSurrogate?(name: string): string }>("convertNameToSurrogate");
    try {
        return converter?.convertNameToSurrogate?.(name);
    } catch (err) {
        logger.warn("Varsayılan emoji Unicode karakterine çevrilemedi:", err);
        return undefined;
    }
}

function isAnimated(target: HTMLElement): boolean {
    const src = target.querySelector("img")?.src;
    if (!src) return false;

    try {
        const url = new URL(src);
        return url.searchParams.get("animated") === "true" || url.pathname.endsWith(".gif");
    } catch {
        return src.includes("animated=true") || src.endsWith(".gif");
    }
}

async function copy(text: string): Promise<void> {
    try {
        await navigator.clipboard?.writeText(text);
    } catch (err) {
        logger.warn("Emoji markdown'u panoya kopyalanamadı:", err);
    }
}

const patch: ContextMenuPatch = (children, props) => {
    const target = props?.target as HTMLElement | undefined;
    if (target?.dataset?.type !== "emoji") return;

    const { id, name } = target.dataset;
    if (!name) return;

    const text = formatEmojiMarkdown({
        id,
        name,
        animated: isAnimated(target),
        unicode: id ? undefined : resolveUnicode(target, name)
    }, settings.store.copyUnicode);

    children.push({
        type: "mcord-copy-emoji-markdown",
        id: "mcord-copy-emoji-markdown",
        label: "Emoji markdown'unu kopyala",
        action: () => void copy(text)
    });
};

export default definePlugin({
    name: "CopyEmojiMarkdown",
    description: "Emoji menüsüne Discord markdown biçimini kopyalama seçeneği ekler",
    authors: [Devs.Berk],
    tags: ["emoji", "kalite-yasam"],
    dependencies: ["ContextMenuAPI"],
    requiresRestart: false,
    settings,

    contextMenus: {
        "expression-picker": patch
    }
});
