/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/*
 * Kanıtlanmış açık-kaynak istemcinin (Vencord) güncel `MemberListDecorators`
 * API'sinin birebir portu.
 */

import { ErrorBoundary } from "../components/ErrorBoundary";
import { McordCreateElement } from "../utils/jsx";

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
    const decorators = Array.from(
        decoratorsFactories.entries(),
        ([key, { render: Decorator, onlyIn }]) => {
            if ((onlyIn === "guilds" && type !== "guild") || (onlyIn === "dms" && type !== "dm")) {
                return null;
            }

            return McordCreateElement(
                ErrorBoundary,
                { noop: true, key, message: `"${key}" üye listesi süslemesi render edilemedi` },
                McordCreateElement(Decorator as any, { ...props, type })
            );
        }
    );

    return McordCreateElement("div", { className: "mcord-member-list-decorators-wrapper" }, decorators);
}
