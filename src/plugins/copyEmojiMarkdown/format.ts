/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

export interface EmojiMarkdownInput {
    id?: string;
    name: string;
    animated?: boolean;
    unicode?: string;
}

export function formatEmojiMarkdown(input: EmojiMarkdownInput, copyUnicode: boolean): string {
    if (!input.id) {
        return copyUnicode && input.unicode
            ? input.unicode
            : `:${input.name}:`;
    }

    const name = input.name.replace(/~\d+$/, "");
    return `<${input.animated ? "a" : ""}:${name}:${input.id}>`;
}
