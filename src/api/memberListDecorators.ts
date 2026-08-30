/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { McordCreateElement, McordFragment } from "../utils/jsx";
import { Logger } from "../utils/logger";

const logger = new Logger("Api:MemberListDecorators", "#f4b8e4");

/**
 * Üye listesi süslemeleri: sunucu üye listesinde bir üyenin isminin hemen
 * sağına küçük eleman (rozet, ikon, etiket) eklemeyi sağlar.
 *
 * Kayıt/silme `PluginManager` üzerinden değil, plugin'in `start`/`stop`'unda
 * `addMemberListDecorator` / `removeMemberListDecorator` ile yapılır.
 */

export type MemberListDecoratorRenderer = (props: Record<string, any>) => any;

const decorators = new Map<string, MemberListDecoratorRenderer>();

export function addMemberListDecorator(id: string, render: MemberListDecoratorRenderer): void {
    if (decorators.has(id)) {
        logger.warn(`Üye listesi süslemesi "${id}" zaten kayıtlı, üzerine yazılıyor.`);
    }
    decorators.set(id, render);
}

export function removeMemberListDecorator(id: string): boolean {
    return decorators.delete(id);
}

/**
 * Patch'in çağırdığı giriş noktası: Discord'un kendi süsleme elemanını alır,
 * bizimkileri ekler, hepsini tek bir fragment içinde döndürür.
 *
 * Her render'da çağrılıyor; her renderer kendi try/catch'inde — bir plugin
 * hata verse bile üye listesi çökmez.
 */
export function renderMemberListDecorators(originalDecoration: any, props: Record<string, any>): any {
    const children: any[] = [originalDecoration];

    for (const [id, render] of decorators) {
        try {
            const element = render(props);
            if (element != null) {
                children.push(McordCreateElement(McordFragment, { key: `mcord-mld-${id}` }, element));
            }
        } catch (err) {
            logger.error(`"${id}" üye listesi süslemesi render edilemedi:\n`, err);
        }
    }

    if (children.length === 1) return originalDecoration;
    return McordCreateElement(McordFragment, null, ...children);
}
