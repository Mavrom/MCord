/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { Logger } from "../../utils/logger";
import { definePlugin, OptionType } from "../../utils/types";
import { ChannelStore, PermissionsBits, PermissionStore } from "../../webpack/common";
import { findLazy } from "../../webpack/lazy";

const logger = new Logger("ShowHiddenChannels", "#a6d189");

/**
 * Kanal listesi satırının hashed CSS sınıfları (`icon__xxxx` kilit ikonu için).
 *
 * Export anahtarları küçültülmüş (`Kk`, `J1`…), sınıf adları **değer** olarak
 * duruyor; bu yüzden değerlere göre aranıyor. Bulunamazsa ikon sınıfsız çizilir.
 */
const ChannelListClasses = findLazy((m: any) =>
    m != null && typeof m === "object"
    && Object.values(m).some(v => typeof v === "string" && v.startsWith("modeSelected__")));

function getIconClass(): string | undefined {
    try {
        return Object.values(ChannelListClasses as object)
            .find((v): v is string => typeof v === "string" && v.startsWith("icon__"));
    } catch {
        return undefined;
    }
}

/** Ses/sahne kanalı tipleri (GUILD_VOICE, GUILD_STAGE_VOICE). */
const VOICE_TYPES = new Set([2, 13]);

const settings = definePluginSettings({
    showVoiceChannels: {
        type: OptionType.BOOLEAN,
        description: "Gizli ses kanallarını da göster",
        default: true
    },
    hideUnreads: {
        type: OptionType.BOOLEAN,
        description: "Gizli kanallarda okunmamış göstergesini gizle",
        default: true,
        restartNeeded: true
    }
});

function hasPermission(permission: bigint | undefined, channel: any): boolean {
    return permission != null && PermissionStore.can(permission, channel);
}

/** Gizli kanal sayfasında gösterilen sade bilgi ekranı (içerik yüklenmez). */
function HiddenChannelNotice({ channel }: { channel: any }) {
    const topic: string | undefined = channel?.topic;
    return (
        <div style={{
            flex: "1 1 auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: 32,
            textAlign: "center",
            color: "var(--text-default, var(--text-normal))"
        }}>
            <svg width="72" height="72" viewBox="0 0 24 24" aria-hidden role="img" style={{ opacity: 0.6 }}>
                <path fill="currentColor" fillRule="evenodd" d="M17 11V7C17 4.243 14.756 2 12 2C9.242 2 7 4.243 7 7V11C5.897 11 5 11.896 5 13V20C5 21.103 5.897 22 7 22H17C18.103 22 19 21.103 19 20V13C19 11.896 18.103 11 17 11ZM12 18C11.172 18 10.5 17.328 10.5 16.5C10.5 15.672 11.172 15 12 15C12.828 15 13.5 15.672 13.5 16.5C13.5 17.328 12.828 18 12 18ZM15 11H9V7C9 5.346 10.346 4 12 4C13.654 4 15 5.346 15 7V11Z" />
            </svg>
            <div style={{ fontSize: 24, fontWeight: 700 }}>
                {channel?.name ? `#${channel.name}` : "Gizli kanal"}
            </div>
            <div style={{ fontSize: 16, opacity: 0.8 }}>
                Bu kanalı görme iznin yok; içeriği yüklenmez.
            </div>
            {topic ? <div style={{ fontSize: 14, opacity: 0.7, maxWidth: 480 }}>{topic}</div> : null}
        </div>
    );
}

/**
 * Vencord'un `ShowHiddenChannels` plugin'inin portu (kilit ekranı sadeleştirildi).
 *
 * Eski sürüm yalnız `PermissionStore.can` sonucunu değiştiriyordu; güncel
 * Discord kanal listesini `ChannelListStore`'daki `renderLevel` hesabından
 * üretiyor ve oradaki izin kontrolü kod seviyesinde — bu yüzden gizli kanallar
 * ya hiç listelenmiyor ya da adsız geliyordu. Vencord gibi render seviyesi
 * hesabına ve etrafındaki tüketicilere kod patch'i atıyoruz.
 */
export default definePlugin({
    name: "ShowHiddenChannels",
    description: "Görme iznin olmayan kanalların adını ve sırasını kanal listesinde gösterir",
    authors: [Devs.Mavrom],
    tags: ["ui", "kanal"],
    settings,
    requiresRestart: true,

    patches: [
        {
            find: '"placeholder-channel-id"',
            reason: "Kanal listesi, görme izni olmayan kanalları renderLevel hesabında eliyor.",
            group: true,
            replacement: [
                {
                    // İzni olmayan kanallar için özel dalı kaldır (ses gizleme ayarına bağlı kısa devre ile değiştir)
                    match: /if\(!\i\.\i\.can\(\i\.\i\.VIEW_CHANNEL.+?{if\(this\.id===\i\).+?threadIds:\[\]}}/,
                    replace: "if($self.shouldSkipChannel(this.record))return{renderLevel:1,threadIds:[]};"
                },
                {
                    // Gizli kanallarda okunmamış kontrolü yapma
                    match: /(?<=&&)(?=!\i\.\i\.hasUnread\(this\.record\.id\))/,
                    replace: "$self.isHiddenChannel(this.record)||"
                },
                {
                    // İzni olmayan kanalları normal kanallarla aynı seviyeye çıkar
                    match: /(this\.record\)\?{renderLevel:(.+?),threadIds.+?renderLevel:).+?(?=,threadIds)/g,
                    replace: (_m: string, rest: string, defaultRenderLevel: string) => `${rest}${defaultRenderLevel}`
                },
                {
                    // getRenderLevel içindeki izin kontrolünü kaldır
                    match: /(getRenderLevel\(\i\){.+?return)!\i\.\i\.can\(\i\.\i\.VIEW_CHANNEL,this\.record\)\|\|/,
                    replace: (_m: string, rest: string) => `${rest} `
                }
            ]
        },
        {
            find: "VoiceChannel, transitionTo: Channel does not have a guildId",
            reason: "Gizli sesli kanala tıklamak bağlanmayı denemesin; kanal sayfası açılsın.",
            replacement: [
                {
                    // Başka kanaldayken gizli sesli kanala tıklayınca onay penceresi çıkmasın
                    match: /(?<=getIgnoredUsersForVoiceChannel\((\i)\.id\)[^;]{0,300}?;return\()/,
                    replace: (_m: string, channel: string) => `!$self.isHiddenChannel(${channel})&&`
                },
                {
                    // Discord gizli sesli kanallara bağlanmayı denemesin
                    match: /(?=\|\|\i\.\i\.selectVoiceChannel\((\i)\.id\))/,
                    replace: (_m: string, channel: string) => `||$self.isHiddenChannel(${channel})`
                },
                {
                    // Gizli ya da kilitli kanala tıklayınca kanalın içine geç
                    match: /!__OVERLAY__&&\((?<=selectVoiceChannel\((\i)\.id\).+?)/,
                    replace: (m: string, channel: string) => `${m}$self.isHiddenChannel(${channel},true)||`
                }
            ]
        },
        {
            find: ".AUDIENCE),{isSubscriptionGated",
            reason: "Gizli sahne kanallarına bağlanmayı engelle.",
            replacement: {
                match: /(\i)\.isRoleSubscriptionTemplatePreviewChannel\(\)/,
                replace: (m: string, channel: string) => `${m}||$self.isHiddenChannel(${channel})`
            }
        },
        {
            find: 'tutorialId:"instant-invite"',
            reason: "Gizli kanalda düzenle/davet butonları çalışmaz; hiç çizme.",
            replacement: ["renderEditButton", "renderInviteButton"].map(func => ({
                // Discord aynı fonksiyonu birden çok kez tanımlıyor
                match: new RegExp(`(?<=${func}\\(\\){)`, "g"),
                replace: "if($self.isHiddenChannel(this?.props?.channel))return null;"
            }))
        },
        {
            find: "VoiceChannel.renderPopout: There must always be something to render",
            reason: "Gizli sesli kanalda sohbet aç butonu çalışmaz; hiç çizme.",
            all: true,
            replacement: {
                match: /(?<=renderOpenChatButton(?:",|=)\(\)=>{)/,
                replace: "if($self.isHiddenChannel(this?.props?.channel))return null;"
            }
        },
        {
            find: "#{intl::CHANNEL_TOOLTIP_DIRECTORY}",
            reason: "Gizli kanallar listede kilit ikonuyla ayırt edilsin.",
            replacement: {
                match: /(?<=(\i)\.isNSFW\(\);)switch\(\i\.type\).{0,15}\.GUILD_ANNOUNCEMENT/,
                replace: (m: string, channel: string) => `if($self.isHiddenChannel(${channel}))return $self.LockIcon;${m}`
            }
        },
        {
            find: "UNREAD_IMPORTANT:",
            reason: "Gizli kanallarda okunmamış göstergesi anlamsız.",
            predicate: () => settings.store.hideUnreads,
            replacement: {
                match: /Children\.count.+?;(?=return\(0,\i\.jsxs?\)\(\i\.\i,{focusTarget:)(?<={channel:(\i),name:\i,.+?unread:(\i).+?)/,
                replace: (m: string, channel: string, unread: string) => `${m}${unread}=$self.isHiddenChannel(${channel})?false:${unread};`
            }
        },
        {
            find: '"ChannelListUnreadsStore"',
            reason: "Okunmamış kutusu gizli kanalları saymasın.",
            replacement: {
                match: /(?<=\.id\)\))(?=&&\(0,\i\.\i\)\((\i)\))/,
                replace: (_m: string, channel: string) => `&&!$self.isHiddenChannel(${channel})`
            }
        },
        {
            find: "renderBottomUnread(){",
            reason: "Eski okunmamış kutusu gizli kanalları göstermesin.",
            replacement: {
                match: /(?<=!0\))(?=&&\(0,\i\.\i\)\((\i\.record)\))/,
                replace: "&&!$self.isHiddenChannel($1)"
            }
        },
        {
            find: "GUILD_EVENT)}),[",
            reason: "Eski okunmamış kutusunun durumu gizli kanalları içermesin.",
            replacement: {
                match: /(?<=\.id\)\))(?=&&\(0,\i\.\i\)\((\i)\))/,
                replace: "&&!$self.isHiddenChannel($1)"
            }
        },
        {
            find: "Missing channel in Channel.renderHeaderToolbar",
            reason: "Gizli kanalda yalnız çalışan üst bar butonları ve bilgi ekranı çizilsin.",
            replacement: [
                {
                    match: /renderHeaderToolbar(?:",|=)\(\)=>{.+?case \i\.\i\.GUILD_TEXT:(?=.+?(\i\.push.{0,50}channel:(\i)},"notifications"\)\)))(?<=isLurking:(\i).+?)/,
                    replace: (m: string, pushNotificationButton: string, channel: string, isLurking: string) =>
                        `${m}if(!${isLurking}&&$self.isHiddenChannel(${channel})){${pushNotificationButton};break;}`
                },
                {
                    match: /renderHeaderToolbar(?:",|=)\(\)=>{.+?case \i\.\i\.GUILD_MEDIA:(?=.+?(\i\.push.{0,40}channel:(\i)},"notifications"\)\)))(?<=isLurking:(\i).+?)/,
                    replace: (m: string, pushNotificationButton: string, channel: string, isLurking: string) =>
                        `${m}if(!${isLurking}&&$self.isHiddenChannel(${channel})){${pushNotificationButton};break;}`
                },
                {
                    match: /renderMobileToolbar(?:",|=)\(\)=>{.+?case \i\.\i\.GUILD_DIRECTORY:(?<=let{channel:(\i).+?)/,
                    replace: (m: string, channel: string) => `${m}if($self.isHiddenChannel(${channel}))break;`
                },
                {
                    match: /(?<=renderHeaderBar(?:",|=)\(\)=>{.+?hideSearch:(\i)\.isDirectory\(\))/,
                    replace: (_m: string, channel: string) => `||$self.isHiddenChannel(${channel})`
                },
                {
                    match: /(?<=renderSidebar\(\){)/,
                    replace: "if($self.isHiddenChannel(this?.props?.channel))return null;"
                },
                {
                    match: /(?<=renderChat\(\){)/,
                    replace: "if($self.isHiddenChannel(this?.props?.channel))return $self.HiddenChannelNotice(this?.props?.channel);"
                }
            ]
        },
        {
            find: '"MessageManager"',
            reason: "Gizli kanaldan mesaj çekmeyi deneme (403).",
            replacement: {
                match: /forceFetch:\i,isPreload:.+?}=\i;(?=.+?getChannel\((\i)\))/,
                replace: (m: string, channelId: string) => `${m}if($self.isHiddenChannel({channelId:${channelId}}))return;`
            }
        },
        {
            find: '"alt+shift+down"',
            reason: "Klavye kısayolları yanlışlıkla gizli kanala atlamasın.",
            replacement: {
                match: /(?<=getChannel\(\i\);return null!=(\i))(?=.{0,200}?>0\)&&\(0,\i\.\i\)\(\i\))/,
                replace: (_m: string, channel: string) => `&&!$self.isHiddenChannel(${channel})`
            }
        },
        {
            find: ".APPLICATION_STORE&&null!=",
            reason: "Klavye kısayolları yanlışlıkla gizli kanala atlamasın.",
            replacement: {
                match: /getState\(\)\.channelId.+?(?=\.map\(\i=>\i\.id)/,
                replace: "$&.filter(e=>!$self.isHiddenChannel(e))"
            }
        },
        {
            find: ",queryStaticRouteChannels(",
            reason: "Sohbet kutusundaki kanal önerileri gizli kanalları da içersin.",
            replacement: [
                {
                    match: /(?<=queryChannels\(\i\){.+?getChannels\(\i)(?=\))/,
                    replace: ",true"
                },
                {
                    match: /(?<=queryChannels\(\i\){.+?\)\((\i)\.type\))(?=&&!\i\.\i\.can\()/,
                    replace: "&&!$self.isHiddenChannel($1)"
                }
            ]
        },
        {
            find: "\"^/guild-stages/(\\\\d+)(?:/)?(\\\\d+)?\"",
            reason: "Gizli kanal bahsedilmeleri tıklanabilir olsun.",
            replacement: {
                match: /\i\.\i\.can\(\i\.\i\.VIEW_CHANNEL,\i\)/,
                replace: "true"
            }
        },
        {
            find: 'getConfig({location:"channel_mention"})',
            reason: "Gizli sesli kanal bahsedilmesine tıklayınca bağlanmayı deneme.",
            replacement: {
                match: /(?<=getChannel\(\i\);if\(null!=(\i)).{0,200}?return void (?=\i\.default\.selectVoiceChannel)/,
                replace: (m: string, channel: string) => `${m}!$self.isHiddenChannel(${channel})&&`
            }
        },
        {
            find: '"GuildChannelStore"',
            reason: "GuildChannelStore gizli kanalları içermeli; yalnız istenmeyen tüketicilerden süzülür.",
            replacement: [
                {
                    match: /isChannelGated\(.+?\)(?=&&)/,
                    replace: (m: string) => `${m}&&false`
                },
                {
                    match: /(?<=getChannels\(\i)(\){.*?)return (.+?)}/,
                    replace: (_m: string, rest: string, channels: string) =>
                        `,shouldIncludeHidden${rest}return $self.resolveGuildChannels(${channels},shouldIncludeHidden??arguments[0]==="@favorites");}`
                }
            ]
        },
        {
            find: "GuildTooltip - ",
            reason: "Sunucu ipucu kanal sayısı gizli kanalları da içersin.",
            replacement: {
                match: /(?<=getChannels\(\i)(?=\))/,
                replace: ",true"
            }
        },
        {
            find: "2026-02-private-channel-hiding",
            reason: "Discord'un özel kanal adlarını istemcide gizleyen deneyini kapat.",
            noWarn: true,
            replacement: {
                match: /(?<=enableObfuscation|enableIntegrityCheck):!0/g,
                replace: ":false"
            }
        }
    ],

    /** Yalnız ses gizleme ayarı kapalıyken gizli ses/sahne kanallarını listeden tamamen çıkarır. */
    shouldSkipChannel(channel: any): boolean {
        if (settings.store.showVoiceChannels) return false;
        return this.isHiddenChannel(channel) && VOICE_TYPES.has(channel.type);
    },

    isHiddenChannel(channel: any, checkConnect = false): boolean {
        try {
            if (channel == null || Object.hasOwn(channel, "channelId") && channel.channelId == null) return false;

            if (channel.channelId != null) channel = ChannelStore.getChannel(channel.channelId);
            if (channel == null || channel.isDM?.() || channel.isGroupDM?.() || channel.isMultiUserDM?.()) return false;
            if (["browse", "customize", "guide"].includes(channel.id)) return false;

            return !hasPermission(PermissionsBits.VIEW_CHANNEL, channel)
                || checkConnect && !hasPermission(PermissionsBits.CONNECT, channel);
        } catch (err) {
            logger.error("isHiddenChannel hatası:", err);
            return false;
        }
    },

    resolveGuildChannels(
        channels: Record<string | number, Array<{ channel: any; comparator: number; }> | string | number>,
        shouldIncludeHidden: boolean
    ) {
        if (shouldIncludeHidden) return channels;

        const res: Record<string | number, any> = {};
        for (const [key, maybeObjChannels] of Object.entries(channels)) {
            if (!Array.isArray(maybeObjChannels)) {
                res[key] = maybeObjChannels;
                continue;
            }

            res[key] ??= [];

            for (const objChannel of maybeObjChannels) {
                if (isUncategorized(objChannel) || objChannel.channel.id === null || !this.isHiddenChannel(objChannel.channel)) {
                    res[key].push(objChannel);
                }
            }
        }

        return res;
    },

    HiddenChannelNotice: (channel: any) => <HiddenChannelNotice channel={channel} />,

    LockIcon: () => (
        <svg
            className={getIconClass()}
            height="18"
            width="20"
            viewBox="0 0 24 24"
            aria-hidden={true}
            role="img"
        >
            <path fill="currentColor" fillRule="evenodd" d="M17 11V7C17 4.243 14.756 2 12 2C9.242 2 7 4.243 7 7V11C5.897 11 5 11.896 5 13V20C5 21.103 5.897 22 7 22H17C18.103 22 19 21.103 19 20V13C19 11.896 18.103 11 17 11ZM12 18C11.172 18 10.5 17.328 10.5 16.5C10.5 15.672 11.172 15 12 15C12.828 15 13.5 15.672 13.5 16.5C13.5 17.328 12.828 18 12 18ZM15 11H9V7C9 5.346 10.346 4 12 4C13.654 4 15 5.346 15 7V11Z" />
        </svg>
    )
});

function isUncategorized(objChannel: { channel: any; comparator: number; }): boolean {
    return objChannel.channel.id === "null" && objChannel.channel.name === "Uncategorized" && objChannel.comparator === -1;
}
