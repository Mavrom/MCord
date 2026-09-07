/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Logger } from "../utils/logger";
import { React } from "../webpack/react";

const logger = new Logger("Api:ContextMenu", "#f4b8e4");

export type ContextMenuPatch = (children: any[], props: Record<string, any>) => void;

/** `navId → patch seti` */
const patches = new Map<string, Set<ContextMenuPatch>>();
/** Her menüde çalışan global patch'ler. */
const globalPatches = new Set<ContextMenuPatch>();

export function addContextMenuPatch(navId: string | string[], patch: ContextMenuPatch): ContextMenuPatch {
    for (const id of Array.isArray(navId) ? navId : [navId]) {
        let set = patches.get(id);
        if (!set) {
            set = new Set();
            patches.set(id, set);
        }
        set.add(patch);
    }
    return patch;
}

export function removeContextMenuPatch(navId: string | string[], patch: ContextMenuPatch): boolean {
    let removed = false;
    for (const id of Array.isArray(navId) ? navId : [navId]) {
        removed = patches.get(id)?.delete(patch) || removed;
    }
    return removed;
}

/**
 * Bir bağlam menüsü ağacında, verilen `id`'li öğeyi içeren grup dizisini bulur.
 * Plugin'ler kendi öğelerini mevcut bir öğenin (ör. `"copy-link"`) yanına
 * eklemek için kullanır (referans katalog `findGroupChildrenByChildId`).
 */
export function findGroupChildrenByChildId(
    id: string | string[],
    children: any[],
    matchSubstring = false
): any[] | null {
    for (const child of children) {
        if (child == null) continue;

        if (Array.isArray(child)) {
            const found = findGroupChildrenByChildId(id, child, matchSubstring);
            if (found !== null) return found;
        }

        const childId = child.props?.id ?? child.id;
        const matches = (target: string) =>
            matchSubstring ? childId?.includes(target) : childId === target;

        if (Array.isArray(id) ? id.some(matches) : matches(id)) return children;

        let nextChildren = child.props?.children ?? child.children;
        if (nextChildren) {
            if (!Array.isArray(nextChildren)) {
                nextChildren = [nextChildren];
                if (child.props) child.props.children = nextChildren;
                else child.children = nextChildren;
            }

            const found = findGroupChildrenByChildId(id, nextChildren, matchSubstring);
            if (found !== null) return found;
        }
    }

    return null;
}

export function addGlobalContextMenuPatch(patch: ContextMenuPatch): ContextMenuPatch {
    globalPatches.add(patch);
    return patch;
}

export function removeGlobalContextMenuPatch(patch: ContextMenuPatch): boolean {
    return globalPatches.delete(patch);
}

/** `ContextMenuAPI` plugin'i tarafından çağrılır. */
export function _patchContextMenu(props: Record<string, any>): void {
    const navId = props.navId;
    const children = props.children;
    if (!Array.isArray(children)) {
        logger.warn(`"${String(navId)}" bağlam menüsünün çocukları dizi değil; patch atlandı.`);
        return;
    }

    const menuItemType = findMenuItemType(children);

    for (const patch of globalPatches) {
        runPatch(patch, children, props, "global");
    }

    const set = patches.get(navId);
    if (set) {
        for (const patch of set) {
            runPatch(patch, children, props, navId);
        }
    }

    materializeMenuItems(children, menuItemType, navId);
}

function runPatch(patch: ContextMenuPatch, children: any[], props: Record<string, any>, navId: string): void {
    try {
        patch(children, props);
    } catch (err) {
        logger.error(`"${navId}" bağlam menüsü patch'inde hata:\n`, err);
    }
}

function findMenuItemType(children: any[]): any {
    for (const child of children) {
        if (Array.isArray(child)) {
            const type = findMenuItemType(child);
            if (type) return type;
            continue;
        }

        const props = child?.props;
        if (props?.id != null && props?.label != null && typeof props?.action === "function") {
            return child.type;
        }

        const nested = props?.children;
        if (Array.isArray(nested)) {
            const type = findMenuItemType(nested);
            if (type) return type;
        } else if (nested?.props) {
            const type = findMenuItemType([nested]);
            if (type) return type;
        }
    }
}

function materializeMenuItems(children: any[], menuItemType: any, navId: string): void {
    for (let index = children.length - 1; index >= 0; index--) {
        const child = children[index];
        if (child?.$$typeof) {
            const nested = child.props?.children;
            if (Array.isArray(nested)) materializeMenuItems(nested, menuItemType, navId);
            else if (nested?.props) materializeMenuItems([nested], menuItemType, navId);
            continue;
        }

        if (typeof child?.type !== "string" || !child.type.startsWith("mcord-")) continue;

        if (menuItemType == null) {
            logger.warn(`"${navId}" bağlam menüsü için MenuItem bileşeni bulunamadı; öğe atlandı.`);
            children.splice(index, 1);
            continue;
        }

        const { type: _type, ...itemProps } = child;
        if (Array.isArray(itemProps.children)) {
            materializeMenuItems(itemProps.children, menuItemType, navId);
        }
        children[index] = React.createElement(menuItemType, { ...itemProps, key: itemProps.id });
    }
}
