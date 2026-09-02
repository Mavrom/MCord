/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { McordCreateElement, McordFragment } from "../utils/jsx";
import { Logger } from "../utils/logger";

const logger = new Logger("Api:MessageAccessories", "#f4b8e4");

export type MessageAccessoryFactory = (props: Record<string, any>) => any;
interface Accessory { render: MessageAccessoryFactory; position?: number }
const accessories = new Map<string, Accessory>();

export function addMessageAccessory(id: string, render: MessageAccessoryFactory, position?: number): void {
    if (accessories.has(id)) logger.warn(`Mesaj aksesuarı "${id}" zaten kayıtlı, üzerine yazılıyor.`);
    accessories.set(id, { render, position });
}

export function removeMessageAccessory(id: string): boolean {
    return accessories.delete(id);
}

export function modifyMessageAccessories(elements: any[], props: Record<string, any>): any[] {
    if (!Array.isArray(elements)) return elements;
    for (const [id, accessory] of accessories) {
        try {
            const element = accessory.render(props);
            if (element == null) continue;
            const position = accessory.position == null
                ? elements.length
                : accessory.position < 0
                    ? Math.max(0, elements.length + accessory.position)
                    : Math.min(elements.length, accessory.position);
            elements.splice(position, 0, McordCreateElement(McordFragment, { key: `mcord-accessory-${id}` }, element));
        } catch (error) {
            logger.error(`"${id}" mesaj aksesuarı render edilemedi:`, error);
        }
    }
    return elements;
}
