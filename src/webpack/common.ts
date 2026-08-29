/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { byCode, byKeys } from "./filters";
import { findByCodeLazy, findLazy, findStoreLazy, waitFor } from "./lazy";
import { mapMangledModuleLazy } from "./mangled";
import type { ModuleExports } from "./types";

/**
 * Discord'un ortak modülleri.
 *
 * Filtreler Discord'un yeniden adlandırmalarına karşı en dayanıklı olacak
 * şekilde seçildi: mümkün olan her yerde anahtar tahmini yerine sabit kalan
 * işaretler (store adı, kaynak string'i) kullanılıyor.
 *
 * Store'lar **adına göre** (`getName()`) bulunuyor: Discord property adlarını
 * mangle etse bile store adı sabit kalıyor.
 */

// ── Dispatcher ───────────────────────────────────────────────────────────────

export let FluxDispatcher: ModuleExports = null;

waitFor(byKeys(["dispatch", "subscribe"]), module => {
    FluxDispatcher = module;
}, { silent: true });

export function getFluxDispatcher(): ModuleExports {
    return FluxDispatcher ?? findLazy(byKeys(["dispatch", "subscribe"]));
}

// ── Store'lar (ada göre) ─────────────────────────────────────────────────────

export const UserStore = findStoreLazy("UserStore");
export const ChannelStore = findStoreLazy("ChannelStore");
export const SelectedChannelStore = findStoreLazy("SelectedChannelStore");
export const GuildStore = findStoreLazy("GuildStore");
export const MessageStore = findStoreLazy("MessageStore");
export const PermissionStore = findStoreLazy("PermissionStore");
export const RelationshipStore = findStoreLazy("RelationshipStore");
export const PrivateChannelSortStore = findStoreLazy<{
    getPrivateChannelIds(): string[];
}>("PrivateChannelSortStore");

// ── Eylem modülleri ──────────────────────────────────────────────────────────

export const MessageActions = findLazy(byKeys(["editMessage", "sendMessage"]));

export const SettingsRouter = findLazy(byKeys(["openUserSettings", "USER_SETTINGS_MODAL_KEY"]));

/**
 * Bağlam menüsü API'si.
 *
 * `openContextMenu` / `closeContextMenu` **mangle edilmiş** property adları —
 * anahtar araması çalışmaz; modül kaynağından mapper'la çözülüyor (plan §4.7).
 */
export const ContextMenuApi = mapMangledModuleLazy('type:"CONTEXT_MENU_OPEN', {
    closeContextMenu: byCode("CONTEXT_MENU_CLOSE"),
    openContextMenu: byCode("renderLazy:"),
    openContextMenuLazy: (value: ModuleExports) =>
        typeof value === "function" && Function.prototype.toString.call(value).length < 100
});

export const transitionTo = findByCodeLazy("transitionTo - Transitioning to");
