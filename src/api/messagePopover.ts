/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { McordCreateElement, McordFragment } from "../utils/jsx";
import { Logger } from "../utils/logger";

const logger = new Logger("Api:MessagePopover", "#f4b8e4");

export interface MessagePopoverButtonItem {
    key?: string;
    label: string;
    icon: any;
    message?: any;
    channel?: any;
    onClick?: (event: MouseEvent) => void;
    onContextMenu?: (event: MouseEvent) => void;
}

export type MessagePopoverButtonFactory = (message: any) => MessagePopoverButtonItem | null;
const buttons = new Map<string, MessagePopoverButtonFactory>();

export function addMessagePopoverButton(id: string, render: MessagePopoverButtonFactory): void {
    if (buttons.has(id)) logger.warn(`Mesaj düğmesi "${id}" zaten kayıtlı, üzerine yazılıyor.`);
    buttons.set(id, render);
}

export function removeMessagePopoverButton(id: string): boolean {
    return buttons.delete(id);
}

export function buildMessagePopoverButtons(Component: any, message: any): any {
    const elements: any[] = [];
    for (const [id, render] of buttons) {
        try {
            const item = render(message);
            if (item) elements.push(McordCreateElement(Component, { key: `mcord-popover-${id}`, ...item }));
        } catch (error) {
            logger.error(`"${id}" mesaj düğmesi render edilemedi:`, error);
        }
    }
    return McordCreateElement(McordFragment, null, ...elements);
}
