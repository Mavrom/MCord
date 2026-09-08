/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { byCode, byKeys, bySource } from "./filters";
import {
    findByCodeLazy,
    findByPropsLazy,
    findComponentByCodeLazy,
    findExportedComponentLazy,
    findLazy,
    findStoreLazy,
    waitFor
} from "./lazy";
import { mapMangledModuleLazy, mapperByRegex } from "./mangled";
import { getReactDOMClient, React, ReactDOM } from "./react";
import type { ModuleExports } from "./types";

/**
 * Discord'un ortak modülleri — Discord'un webpack modül kataloğu.
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
/** Flux `Store` temel sınıfı — `class X extends Flux.Store` için. */
export const FluxStore = findLazy((m: any) => m?.Store?.getAll && m?.connectStores) as any;

export let ComponentDispatch: any = null;
waitFor(byKeys(["dispatchToLastSubscribed"]), m => ComponentDispatch = m, { silent: true });

/** `DraftType` enum'u (ChannelMessage, SlashCommand, …). */
export const DraftType = findByPropsLazy("ChannelMessage", "SlashCommand");

/** Discord'un kendi user-settings proto action creator'ları. */
export const UserSettingsActionCreators = {
    get FrecencyUserSettingsActionCreators() {
        return findLazy((m: any) => m?.ProtoClass?.typeName?.endsWith(".FrecencyUserSettings"));
    },
    get PreloadedUserSettingsActionCreators() {
        return findLazy((m: any) => m?.ProtoClass?.typeName?.endsWith(".PreloadedUserSettings"));
    }
};

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

// Kalan store'lar.
export const AccessibilityStore = findStoreLazy("AccessibilityStore");
export const ApplicationStore = findStoreLazy("ApplicationStore");
export const AuthenticationStore = findStoreLazy("AuthenticationStore");
export const GuildScheduledEventStore = findStoreLazy("GuildScheduledEventStore");
export const GuildMemberCountStore = findStoreLazy("GuildMemberCountStore");
export const NotificationSettingsStore = findStoreLazy("NotificationSettingsStore");
export const SpellCheckStore = findStoreLazy("SpellcheckStore");
export const UploadAttachmentStore = findStoreLazy("UploadAttachmentStore");
export const OverridePremiumTypeStore = findStoreLazy("OverridePremiumTypeStore");
export const ActiveJoinedThreadsStore = findStoreLazy("ActiveJoinedThreadsStore");
export const UserGuildSettingsStore = findStoreLazy("UserGuildSettingsStore");
export const UserSettingsProtoStore = findStoreLazy("UserSettingsProtoStore");
export const CallStore = findStoreLazy("CallStore");
export const ChannelRTCStore = findStoreLazy("ChannelRTCStore");
export const FriendsStore = findStoreLazy("FriendsStore");
export const InstantInviteStore = findStoreLazy("InstantInviteStore");
export const InviteStore = findStoreLazy("InviteStore");
export const RTCConnectionStore = findStoreLazy("RTCConnectionStore");
export const SoundboardStore = findStoreLazy("SoundboardStore");
export const PopoutWindowStore = findStoreLazy("PopoutWindowStore");
export const ApplicationCommandIndexStore = findStoreLazy("ApplicationCommandIndexStore");
export const EditMessageStore = findStoreLazy("EditMessageStore");
export const ExperimentStore = findStoreLazy("ExperimentStore");
export const UserAffinitiesStore = findStoreLazy("UserAffinitiesV2Store");
export const ApplicationStreamingStore = findStoreLazy("ApplicationStreamingStore");
export const ApplicationStreamPreviewStore = findStoreLazy("ApplicationStreamPreviewStore");
export const GuildChannelsStore = GuildChannelStore;

// ── REST / sabitler ─────────────────────────────────────────────────────────

/**
 * Discord'un RestAPI'sı. Bazı Discord
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

// ── Modal'lar ───────────────────────────────────────────────────────────────

/**
 * `openModal` / `closeModal` vb. — plugin'lerin kendi modal'ını açması için.
 * Finder tanımları canlı Discord'a karşı doğrulanmış.
 */
export const Modals = mapMangledModuleLazy(".modalKey?", {
    openModalLazy: byCode(".modalKey?"),
    openModal: byCode(",instant:"),
    closeModal: byCode(".onCloseCallback()"),
    closeAllModals: byCode(".getState();for")
}) as any;

export const openModal: (render: any, options?: any, key?: string) => string = (...args: any[]) => (Modals as any).openModal(...args);
export const openModalLazy: (render: () => Promise<any>, options?: any) => Promise<string> = (...args: any[]) => (Modals as any).openModalLazy(...args);
export const closeModal: (key: string) => void = (...args: any[]) => (Modals as any).closeModal(...args);
export const closeAllModals: () => void = () => (Modals as any).closeAllModals();

/** `ModalRoot`, `ModalHeader`, `ModalContent`, `ModalFooter`, `ModalCloseButton`, `ModalSize`. */
export const ModalComponents = findByPropsLazy("ModalRoot", "ModalHeader", "ModalContent") as any;
export const ModalRoot: any = new Proxy((() => null) as any, { get: (_t, p) => (ModalComponents as any).ModalRoot?.[p], apply: (_t, _th, a) => (ModalComponents as any).ModalRoot(...a) });
export const ModalHeader: any = new Proxy((() => null) as any, { get: (_t, p) => (ModalComponents as any).ModalHeader?.[p], apply: (_t, _th, a) => (ModalComponents as any).ModalHeader(...a) });
export const ModalContent: any = new Proxy((() => null) as any, { get: (_t, p) => (ModalComponents as any).ModalContent?.[p], apply: (_t, _th, a) => (ModalComponents as any).ModalContent(...a) });
export const ModalFooter: any = new Proxy((() => null) as any, { get: (_t, p) => (ModalComponents as any).ModalFooter?.[p], apply: (_t, _th, a) => (ModalComponents as any).ModalFooter(...a) });
export const ModalCloseButton: any = new Proxy((() => null) as any, { get: (_t, p) => (ModalComponents as any).ModalCloseButton?.[p], apply: (_t, _th, a) => (ModalComponents as any).ModalCloseButton(...a) });
export const ModalSize: any = new Proxy({}, { get: (_t, p) => (ModalComponents as any).ModalSize?.[p] });

// ── Menü bileşenleri ────────────────────────────────────────────────────────

/** `<Menu.Menu>`, `<Menu.MenuItem>`, `<Menu.MenuGroup>`, `<Menu.MenuCheckboxItem>` … */
export const Menu: any = findByPropsLazy("MenuGroup", "MenuItem", "MenuSeparator");

// ── Discord UI bileşenleri (canlı Discord finder'ları) ─────────────────────
//
// Bu Discord build'inde uymayan olursa
// lazy olduğu için no-op'a düşer (plugin kullanınca fark edilir, o an düzeltilir).

export const Checkbox = findComponentByCodeLazy('"data-toggleable-component":"checkbox');
export const TextInput = findComponentByCodeLazy('setHasValue?.(""!==', '="text",');
export const TextArea = findComponentByCodeLazy("!0,rows:", "showRemainingCharacterCount:");
export const Select = findComponentByCodeLazy('selectionMode:"single",onSelectionChange:', "isSelected:");
export const SearchableSelect = findComponentByCodeLazy('?"multiple":"single",required:');
export const Slider = findComponentByCodeLazy("markDash", "this.renderMark(");
export const Popout = findComponentByCodeLazy("ref:this.ref,", "renderPopout:this.renderPopout,");
export const Dialog = findComponentByCodeLazy('role:"dialog",tabIndex:-1');
export const Clickable = findComponentByCodeLazy("this.context?this.renderNonInteractive():");
export const Avatar = findComponentByCodeLazy(".size-1.375*");
export const FocusLock = findComponentByCodeLazy(".containerRef,{keyboardModeEnabled:");
export const MaskedLink = findComponentByCodeLazy("MASKED_LINK)");
export const Timestamp = findComponentByCodeLazy("#{intl::MESSAGE_EDITED_TIMESTAMP_A11Y_LABEL}");
export const OAuth2AuthorizeModal = findComponentByCodeLazy("hasContentBackground", "nextStep", "onClose?.()");

/** Discord'un `Tooltip` sınıfı (MCord'un kendi `components/Tooltip`'inden ayrı). */
export const Tooltip: any = findLazy((m: any) => m?.prototype?.shouldShowTooltip && m.prototype.render);
export const TooltipContainer = findComponentByCodeLazy("this.renderTooltip()", "positionKey");

// Ham Discord bileşen
// finder'ları:
export const Button = findComponentByCodeLazy("#{intl::A11Y_LOADING_STARTED}", "buttonRef", "submittingFinishedLabel");
export const Switch = findComponentByCodeLazy("xanchorScrollLeft", "wrapperClass", "onChange");
export const Text = findComponentByCodeLazy('lineClamp:"var(--lineClamp")', ',lineHeight:"var(--lineHeight")');
export const Heading = findComponentByCodeLazy('"h1":', 'variant:"heading', "level:");
export const Card = findComponentByCodeLazy(".editable]:");
export const Paragraph: any = Text;

export const Forms = {
    get FormSection() { return findExportedComponentLazy("FormSection") as any; },
    get FormTitle() { return Heading as any; },
    get FormText() { return Text as any; },
    get FormItem() { return findExportedComponentLazy("FormItem") as any; },
    get FormDivider() { return findExportedComponentLazy("FormDivider") as any; },
    get FormSwitch() { return Switch as any; }
};

// ── Util modülleri ─────────────────────────────────────

export const Clipboard = findByPropsLazy("SUPPORTS_COPY", "copy");

export const UploadHandler = {
    promptToUpload: findByCodeLazy("Unexpected mismatch between files and file metadata") as
        (files: File[], channel: any, draftType: number) => void
};

export const UserUtils = { getUser: findByCodeLazy(".USER(") as (id: string) => Promise<any> };

/** highlight.js — kod bloğu vurgulama. */
export const hljs = findByPropsLazy("highlight", "registerLanguage");

export const ApplicationAssetUtils = mapMangledModuleLazy("getAssetImage: size must === [", {
    fetchAssetIds: byCode('.startsWith("http:")', ".dispatch({"),
    getAssetFromImageURL: byCode("].serialize(", ":null"),
    getAssetImage: byCode("getAssetImage: size must === ["),
    getAssets: byCode(".assets")
}) as any;

export const { zustandCreate } = mapMangledModuleLazy(
    bySource("useSyncExternalStoreWithSelector:", "Object.assign"),
    { zustandCreate: mapperByRegex(/=>(\w+)\?\w+\(\1/) }
) as any;

export const { zustandPersist } = mapMangledModuleLazy(
    ".onRehydrateStorage)?",
    { zustandPersist: mapperByRegex(/(\(\w+,\w+\))=>.+?\w+\1/) }
) as any;

export const ExpressionPickerStore = mapMangledModuleLazy("expression-picker-last-active-view", {
    openExpressionPicker: mapperByRegex(/setState\({activeView:(?:(?!null)\w+),activeViewType:/),
    closeExpressionPicker: byCode("setState({activeView:null"),
    toggleExpressionPicker: mapperByRegex(/\w\.activeView===\w+&&\w+\.activeViewType===\w+&&/),
    setExpressionPickerView: mapperByRegex(/setState\({activeView:\w+,lastActiveView:/),
    setSearchQuery: byCode("searchQuery:")
}) as any;

export const PopoutActions = mapMangledModuleLazy('type:"POPOUT_WINDOW_OPEN"', {
    open: byCode('type:"POPOUT_WINDOW_OPEN"'),
    close: byCode('type:"POPOUT_WINDOW_CLOSE"'),
    setAlwaysOnTop: byCode('type:"POPOUT_WINDOW_SET_ALWAYS_ON_TOP"')
}) as any;

export const DisplayProfileUtils = mapMangledModuleLazy(
    bySource(".getUserProfile(", ".getGuildMemberProfile("),
    {
        getDisplayProfile: byCode(".getGuildMemberProfile("),
        useDisplayProfile: mapperByRegex(/\[\w+\.\w+,\w+\.\w+],\(\)=>/)
    }
) as any;

/** `useStateFromStores([Store], () => Store.get())` — çok kullanılan hook. */
export const useStateFromStores: <T>(
    stores: any[],
    getState: () => T,
    deps?: any[],
    compare?: (a: T, b: T) => boolean
) => T = findByCodeLazy("useStateFromStores") as any;

/** Discord intl proxy. */
export const i18n = mapMangledModuleLazy(bySource('defaultLocale:"en-US"', "initialLocale:"), {
    t: (m: any) => m?.[Symbol.toStringTag] === "IntlMessagesProxy",
    intl: (m: any) => m != null && Object.getPrototypeOf(m)?.withFormatters != null
}) as any;

// ── React (doğrudan hook export'ları) ──────────────────

export { getReactDOMClient, React, ReactDOM };

/** `getReactDOMClient().createRoot` kısayolu. */
export const createRoot = (el: Element) => getReactDOMClient().createRoot(el);

export const useState: typeof React.useState = ((...a: any[]) => (React as any).useState(...a)) as any;
export const useEffect: typeof React.useEffect = ((...a: any[]) => (React as any).useEffect(...a)) as any;
export const useLayoutEffect: typeof React.useLayoutEffect = ((...a: any[]) => (React as any).useLayoutEffect(...a)) as any;
export const useMemo: typeof React.useMemo = ((...a: any[]) => (React as any).useMemo(...a)) as any;
export const useRef: typeof React.useRef = ((...a: any[]) => (React as any).useRef(...a)) as any;
export const useReducer: typeof React.useReducer = ((...a: any[]) => (React as any).useReducer(...a)) as any;
export const useCallback: typeof React.useCallback = ((...a: any[]) => (React as any).useCallback(...a)) as any;
