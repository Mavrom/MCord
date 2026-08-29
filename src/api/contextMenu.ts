/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Logger } from "../utils/logger";

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

    for (const patch of globalPatches) {
        runPatch(patch, props.children, props, "global");
    }

    const set = patches.get(navId);
    if (!set) return;

    for (const patch of set) {
        runPatch(patch, props.children, props, navId);
    }
}

function runPatch(patch: ContextMenuPatch, children: any[], props: Record<string, any>, navId: string): void {
    try {
        patch(children, props);
    } catch (err) {
        logger.error(`"${navId}" bağlam menüsü patch'inde hata:\n`, err);
    }
}
