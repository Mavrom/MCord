/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/*
 * Kanıtlanmış açık-kaynak istemcinin (Vencord) güncel `MemberListDecorators`
 * API'sinin portu.
 *
 * NOT: Vencord her süslemeyi `<ErrorBoundary noop>` ile sarıyor. MCord'da
 * `ErrorBoundary` `class extends React.Component` — modül yüklenirken
 * değerlendiriliyor ve `/login` gibi React henüz hazır olmayan bağlamlarda
 * fırlatıyor. Bu yüzden burada `ErrorBoundary` import etmiyoruz; her renderer'ı
 * kendi `try/catch`'inde çağırıyoruz (eski MCord deseni).
 */

import { Logger } from "../utils/logger";
import { McordCreateElement } from "../utils/jsx";

const logger = new Logger("Api:MemberListDecorators", "#f4b8e4");

interface DecoratorProps {
    type: "guild" | "dm";
    user: any;
    /** yalnız DM liste öğesinde var */
    channel: any;
    /** yalnız sunucu liste öğesinde var */
    isOwner: boolean;
    [key: string]: any;
}

export type MemberListDecoratorFactory = (props: DecoratorProps) => any;
type OnlyIn = "guilds" | "dms";

export const decoratorsFactories = new Map<string, { render: MemberListDecoratorFactory; onlyIn?: OnlyIn; }>();

export function addMemberListDecorator(identifier: string, render: MemberListDecoratorFactory, onlyIn?: OnlyIn): void {
    decoratorsFactories.set(identifier, { render, onlyIn });
}

export function removeMemberListDecorator(identifier: string): void {
    decoratorsFactories.delete(identifier);
}

export function __getDecorators(props: DecoratorProps, type: "guild" | "dm"): any {
    const decorators: any[] = [];

    for (const [key, { render, onlyIn }] of decoratorsFactories) {
        if ((onlyIn === "guilds" && type !== "guild") || (onlyIn === "dms" && type !== "dm")) {
            continue;
        }

        try {
            const element = render({ ...props, type });
            if (element != null) {
                decorators.push(McordCreateElement("div", { key }, element));
            }
        } catch (err) {
            logger.error(`"${key}" üye listesi süslemesi render edilemedi:\n`, err);
        }
    }

    return McordCreateElement("div", { className: "mcord-member-list-decorators-wrapper" }, decorators);
}
