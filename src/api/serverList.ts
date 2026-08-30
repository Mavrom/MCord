/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { McordCreateElement, McordFragment } from "../utils/jsx";
import { Logger } from "../utils/logger";

const logger = new Logger("Api:ServerList", "#f4b8e4");

/**
 * Sunucu listesi (sol şerit) süslemeleri: guild listesinin üstüne veya altına
 * eleman (düğme, ikon) eklemeyi sağlar.
 *
 * Kayıt/silme plugin'in `start`/`stop`'unda `addServerListElement` /
 * `removeServerListElement` ile yapılır.
 */

export type ServerListPosition = "above" | "below";
export type ServerListRenderer = () => any;

const registries: Record<ServerListPosition, Map<string, ServerListRenderer>> = {
    above: new Map(),
    below: new Map()
};

export function addServerListElement(
    position: ServerListPosition,
    id: string,
    render: ServerListRenderer
): void {
    const registry = registries[position];
    if (registry.has(id)) {
        logger.warn(`Sunucu listesi elemanı "${id}" (${position}) zaten kayıtlı, üzerine yazılıyor.`);
    }
    registry.set(id, render);
}

export function removeServerListElement(position: ServerListPosition, id: string): boolean {
    return registries[position].delete(id);
}

/**
 * Patch'in çağırdığı giriş noktası. Her zaman bir dizi döndürür (JSX children
 * içine `...` ile yayılıyor); hata durumunda boş dizi.
 */
export function renderServerListElements(position: ServerListPosition): any[] {
    const output: any[] = [];

    const registry = registries[position];
    if (registry == null) return output;

    for (const [id, render] of registry) {
        try {
            const element = render();
            if (element != null) {
                output.push(McordCreateElement(McordFragment, { key: `mcord-sl-${position}-${id}` }, element));
            }
        } catch (err) {
            logger.error(`"${id}" sunucu listesi elemanı render edilemedi:\n`, err);
        }
    }

    return output;
}
