/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { byCode, byKeys } from "./filters";
import { findByCodeLazy, findByPropsLazy, findLazy, findStoreLazy, waitFor } from "./lazy";
import { mapMangledModuleLazy } from "./mangled";
import type { ModuleExports } from "./types";

/**
 * Discord'un ortak modülleri — referans katalog `webpack/common`'una denk katalog.
 *
 * Filtreler dayanıklılık sırasına göre seçildi:
 * `findStoreLazy(ad)` > `findByPropsLazy(props)` > `mapMangledModuleLazy(kaynak)`.
 * Kırılan bir finder reporter self-check'te (renderer.ts) yakalanıyor.
 */

// ── Dispatcher ───────────────────────────────────────────────────────────────

export let FluxDispatcher: ModuleExports = null;

waitFor(byKeys(["dispatch", "subscribe"]), module => {
    FluxDispatcher = module;
}, { silent: true });

export function getFluxDispatcher(): ModuleExports {
    return FluxDispatcher ?? findLazy(byKeys(["dispatch", "subscribe"]));
}

export const Flux = findByPropsLazy("connectStores");

export let ComponentDispatch: any = null;
waitFor(byKeys(["dispatchToLastSubscribed"]), m => ComponentDispatch = m, { silent: true });

// ── Store'lar (ada göre — mangle'a dayanıklı) ────────────────────────────────

export const UserStore = findStoreLazy("UserStore");
export const ChannelStore = findStoreLazy("ChannelStore");
export const SelectedChannelStore = findStoreLazy("SelectedChannelStore");
export const SelectedGuildStore = findStoreLazy("SelectedGuildStore");
export const GuildStore = findStoreLazy("GuildStore");
export const GuildChannelStore = findStoreLazy("GuildChannelStore");
export const GuildMemberStore = findStoreLazy("GuildMemberStore");
export const GuildRoleStore = findStoreLazy("GuildRoleStore");
export const MessageStore = findStoreLazy("MessageStore");
export const PermissionStore = findStoreLazy("PermissionStore");
export const RelationshipStore = findStoreLazy("RelationshipStore");
export const PresenceStore = findStoreLazy("PresenceStore");
export const ReadStateStore = findStoreLazy("ReadStateStore");
export const TypingStore = findStoreLazy("TypingStore");
export const EmojiStore = findStoreLazy("EmojiStore");
export const StickersStore = findStoreLazy("StickersStore");
export const ThemeStore = findStoreLazy("ThemeStore");
export const WindowStore = findStoreLazy("WindowStore");
export const DraftStore = findStoreLazy("DraftStore");
export const VoiceStateStore = findStoreLazy("VoiceStateStore");
export const SessionsStore = findStoreLazy("SessionsStore");
export const UserProfileStore = findStoreLazy("UserProfileStore");
export const StreamerModeStore = findStoreLazy("StreamerModeStore");
export const SpotifyStore = findStoreLazy("SpotifyStore");
export const MediaEngineStore = findStoreLazy("MediaEngineStore");
export const RunningGameStore = findStoreLazy("RunningGameStore");
export const LocaleStore = findStoreLazy("LocaleStore");
export const PendingReplyStore = findStoreLazy("PendingReplyStore");
export const PrivateChannelSortStore = findStoreLazy<{
    getPrivateChannelIds(): string[];
}>("PrivateChannelSortStore");

// ── REST / sabitler ─────────────────────────────────────────────────────────

/**
 * Discord'un RestAPI'sı. referans katalog: `findLazy(m => m.del && m.put)`. Bazı Discord
 * sürümlerinde bu SuperAgent'ı da yakalıyor — authed API isteği için
 * `api/net.ts` `discordApi()` (token + main-process fetch) daha güvenilir.
 */
export const RestAPI = findLazy((m: any) =>
    m && typeof m === "object" && typeof m.del === "function" && typeof m.put === "function");

export const Constants = mapMangledModuleLazy('ME:"/users/@me"', {
    Endpoints: byKeys(["USER", "ME"]),
    UserFlags: byKeys(["STAFF", "SPAMMER"]),
    FriendsSections: (m: any) => m?.PENDING === "PENDING" && m.ADD_FRIEND
});

/** İzin bitleri — `PermissionsBits.CREATE_GUILD_EXPRESSIONS` gibi (bigint). */
export const PermissionsBits = findLazy((m: any) => typeof m?.ADMINISTRATOR === "bigint");

// ── Eylem modülleri / util ──────────────────────────────────────────────────

export const MessageActions = findByPropsLazy("editMessage", "sendMessage");
export const MessageCache = findByPropsLazy("clearCache", "_channelMessages");
export const ChannelActionCreators = findByPropsLazy("openPrivateChannel");
export const InviteActions = findByPropsLazy("resolveInvite");
export const UserProfileActions = findByPropsLazy("openUserProfileModal", "closeUserProfileModal");
export const UploadManager = findByPropsLazy("clearAll", "addFile");

export const IconUtils = findByPropsLazy("getGuildBannerURL", "getUserAvatarURL");
export const UsernameUtils = findByPropsLazy("useName", "getGlobalName");
export const MessageTypeSets = findByPropsLazy("REPLYABLE", "FORWARDABLE");

export const SnowflakeUtils = findByPropsLazy("fromTimestamp", "extractTimestamp");
export const Parser = findByPropsLazy("parseTopic", "parse");
export const Alerts = findByPropsLazy("show", "close");

/** moment.js — Discord bundle'ında (tip yok, `any`). */
export const moment: any = findByPropsLazy("parseTwoDigitYear");
/** lodash — Discord bundle'ında (tip yok, `any`). */
export const lodash: any = findByPropsLazy("debounce", "cloneDeep");

export const SettingsRouter = findByPropsLazy("open", "saveAccountChanges") as any
    ?? findLazy(byKeys(["openUserSettings", "USER_SETTINGS_MODAL_KEY"]));

const ToastsExports = mapMangledModuleLazy(".currentToastMap.has(", {
    showToast: byCode(".currentToastMap.has("),
    popToast: byCode(".delete(")
});

export const Toasts = {
    Type: {
        MESSAGE: "message", SUCCESS: "success", FAILURE: "failure", CUSTOM: "custom",
        CLIP: "clip", LINK: "link", FORWARD: "forward", BOOKMARK: "bookmark", CLOCK: "clock"
    },
    Position: { TOP: 0, BOTTOM: 1 },
    genId: () => (Math.random() || Math.random()).toString(36).slice(2),
    get show() { return (ToastsExports as any).showToast; },
    get pop() { return (ToastsExports as any).popToast; },
    create(message: string, type: string, options?: any) {
        return { message, id: Toasts.genId(), type, options };
    }
};

// ── Bağlam menüsü ───────────────────────────────────────────────────────────

export const ContextMenuApi = mapMangledModuleLazy('type:"CONTEXT_MENU_OPEN', {
    closeContextMenu: byCode("CONTEXT_MENU_CLOSE"),
    openContextMenu: byCode("renderLazy:"),
    openContextMenuLazy: (value: ModuleExports) =>
        typeof value === "function" && Function.prototype.toString.call(value).length < 100
});

// ── Yönlendirme ─────────────────────────────────────────────────────────────

export const transitionTo = findByCodeLazy("transitionTo - Transitioning to");

/** İstemci içi yönlendirici — `transitionTo("/channels/...")` kanalı açar. */
export const NavigationRouter = mapMangledModuleLazy("Transitioning to ", {
    transitionTo: byCode("transitionTo -"),
    transitionToGuild: byCode("transitionToGuild -"),
    back: byCode("goBack()"),
    forward: byCode("goForward()")
});

export const ChannelRouter = mapMangledModuleLazy('"Thread must have a parent ID."', {
    transitionToChannel: byCode(".preload"),
    transitionToThread: byCode('"Thread must have a parent ID."')
});
