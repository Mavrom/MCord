/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { McordCreateElement, McordFragment } from "../utils/jsx";
import { Logger } from "../utils/logger";

const logger = new Logger("Api:ChatComponents", "#f4b8e4");

/**
 * Sohbet çubuğu düğmeleri ve mesaj süslemeleri (plan §6.5 tablosu).
 *
 * Kayıt/silme `PluginManager` tarafından simetrik olarak yapılır; plugin
 * durunca kanca otomatik kalkar.
 */

export type ChatBarButtonRenderer = (props: Record<string, any>) => any;
export type MessageDecorationRenderer = (props: Record<string, any>) => any;

const chatBarButtons = new Map<string, ChatBarButtonRenderer>();
const messageDecorations = new Map<string, MessageDecorationRenderer>();

export function addChatBarButton(id: string, render: ChatBarButtonRenderer): void {
    if (chatBarButtons.has(id)) {
        logger.warn(`Sohbet çubuğu düğmesi "${id}" zaten kayıtlı, üzerine yazılıyor.`);
    }
    chatBarButtons.set(id, render);
}

export function removeChatBarButton(id: string): boolean {
    return chatBarButtons.delete(id);
}

export function addMessageDecoration(id: string, render: MessageDecorationRenderer): void {
    if (messageDecorations.has(id)) {
        logger.warn(`Mesaj süslemesi "${id}" zaten kayıtlı, üzerine yazılıyor.`);
    }
    messageDecorations.set(id, render);
}

export function removeMessageDecoration(id: string): boolean {
    return messageDecorations.delete(id);
}

/** Render tarafı bu listeleri okur; her renderer kendi try/catch'inde çalışır. */
export function renderChatBarButtons(props: Record<string, any>): any[] {
    return renderAll(chatBarButtons, props, "sohbet çubuğu düğmesi");
}

export function renderMessageDecorations(props: Record<string, any>): any[] {
    return renderAll(messageDecorations, props, "mesaj süslemesi");
}

function renderAll(
    registry: Map<string, (props: Record<string, any>) => any>,
    props: Record<string, any>,
    label: string
): any[] {
    const output: any[] = [];

    for (const [id, render] of registry) {
        try {
            const element = render(props);
            // Liste içinde render edildikleri için key şart; plugin adı zaten benzersiz.
            if (element != null) output.push(McordCreateElement(McordFragment, { key: `mcord-${id}` }, element));
        } catch (err) {
            logger.error(`"${id}" ${label} render edilemedi:\n`, err);
        }
    }

    return output;
}
