/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { addProfileBadge, type ProfileBadge, removeProfileBadge } from "../../api/badges";
import { addMemberListDecorator, removeMemberListDecorator } from "../../api/memberListDecorators";
import { definePluginSettings } from "../../api/settings";
import {
    IconPlatformConsole,
    IconPlatformDesktop,
    IconPlatformMobile,
    IconPlatformWeb
} from "../../components/Icons";
import { Tooltip } from "../../components/Tooltip";
import { Devs } from "../../utils/constants";
import { definePlugin, OptionType } from "../../utils/types";
import { UserStore } from "../../webpack/common";
import { findStoreLazy } from "../../webpack/lazy";
import { React } from "../../webpack/react";

const PresenceStore = findStoreLazy("PresenceStore");
const SessionsStore = findStoreLazy("SessionsStore");

const settings = definePluginSettings({
    messages: { type: OptionType.BOOLEAN, description: "Mesajlarda (ve DM'lerde) göster", default: true },
    memberList: { type: OptionType.BOOLEAN, description: "Üye listesinde göster", default: true },
    profile: { type: OptionType.BOOLEAN, description: "Profilde rozet olarak göster", default: true },
    size: {
        type: OptionType.SELECT,
        description: "İkon boyutu",
        options: [
            { label: "Küçük", value: "kucuk" },
            { label: "Orta", value: "orta", default: true },
            { label: "Büyük", value: "buyuk" }
        ]
    }
});

const SIZES: Record<string, { list: number; msg: number }> = {
    kucuk: { list: 14, msg: 16 },
    orta: { list: 16, msg: 18 },
    buyuk: { list: 18, msg: 21 }
};

const LABELS: Record<string, string> = {
    desktop: "Masaüstü",
    mobile: "Mobil",
    web: "Web",
    embedded: "Konsol",
    ps4: "PlayStation",
    ps5: "PlayStation",
    xbox: "Xbox"
};

type IconProps = { size?: number; color?: string; strokeWidth?: number };

const ICONS: Record<string, (props: IconProps) => JSX.Element> = {
    desktop: IconPlatformDesktop,
    mobile: IconPlatformMobile,
    web: IconPlatformWeb,
    embedded: IconPlatformConsole,
    ps4: IconPlatformConsole,
    ps5: IconPlatformConsole,
    xbox: IconPlatformConsole
};

/**
 * Rozet data-URI'si için ham SVG yolları — `components/Icons.tsx`'teki
 * `IconPlatform*` bileşenleriyle aynı çizimler (badge API yalnızca resim URL'i
 * aldığı için burada tekrar tanımlı).
 */
const ICON_PATHS: Record<string, string> = {
    desktop: "<rect x='3' y='4' width='18' height='12' rx='1.5'/><path d='M8 20h8M12 16v4'/>",
    mobile: "<rect x='7' y='3' width='10' height='18' rx='2.5'/><path d='M11 18h2'/>",
    web: "<circle cx='12' cy='12' r='9'/><path d='M3.5 12h17M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18'/>",
    embedded: "<path d='M6 8h12a4 4 0 0 1 4 4v3a2.5 2.5 0 0 1-4.6 1.4L15.5 15h-7l-1.9 2.4A2.5 2.5 0 0 1 2 16v-4a4 4 0 0 1 4-4Z'/><path d='M7 12h2M8 11v2M15 11.5h.01M17.5 13h.01'/>"
};

/** Discord'un durum renkleri — CSS değişkeninden (arayüz), hex (rozet resmi). */
const STATUS_COLOR: Record<string, string> = {
    online: "var(--status-online, #23a55a)",
    idle: "var(--status-idle, #f0b232)",
    dnd: "var(--status-dnd, #f23f43)",
    streaming: "var(--status-streaming, #593695)",
    offline: "var(--status-offline, #82858f)",
    invisible: "var(--status-offline, #82858f)"
};

const STATUS_HEX: Record<string, string> = {
    online: "#23a55a",
    idle: "#f0b232",
    dnd: "#f23f43",
    streaming: "#593695"
};

const STATUS_LABEL: Record<string, string> = {
    online: "çevrim içi",
    idle: "boşta",
    dnd: "rahatsız etmeyin",
    streaming: "yayında",
    offline: "çevrim dışı"
};

function currentPlatforms(userId: string): Record<string, string> {
    if (userId && userId === UserStore?.getCurrentUser?.()?.id) {
        const sessions = Object.values(SessionsStore?.getSessions?.() ?? {}) as any[];
        return Object.fromEntries(
            sessions
                .map(session => [session.clientInfo?.client, session.status])
                .filter(([client]) => client && client !== "unknown")
        );
    }
    return PresenceStore?.getClientStatus?.(userId) ?? {};
}

function badgeDataUri(platform: string, hex: string): string {
    const inner = ICON_PATHS[platform] ?? ICON_PATHS.embedded;
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='${hex}' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'>${inner}</svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function Indicators({ user, small }: { user: any; small: boolean }) {
    const compute = () => currentPlatforms(user?.id);
    const [platforms, setPlatforms] = React.useState<Record<string, string>>(compute);

    React.useEffect(() => {
        const update = () => setPlatforms(compute());
        PresenceStore?.addChangeListener?.(update);
        SessionsStore?.addChangeListener?.(update);
        return () => {
            PresenceStore?.removeChangeListener?.(update);
            SessionsStore?.removeChangeListener?.(update);
        };
    }, [user?.id]);

    if (!user || user.bot) return null;

    const entries = Object.entries(platforms);
    if (entries.length === 0) return null;

    const scale = SIZES[settings.store.size as string] ?? SIZES.orta;
    const size = small ? scale.list : scale.msg;

    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
                marginLeft: "4px",
                verticalAlign: "middle"
            }}
        >
            {entries.map(([platform, status]) => {
                const Icon = ICONS[platform] ?? IconPlatformConsole;
                const color = STATUS_COLOR[status] ?? STATUS_COLOR.offline;
                const label = `${LABELS[platform] ?? platform} — ${STATUS_LABEL[status] ?? status}`;

                return (
                    <Tooltip key={platform} text={label}>
                        <span aria-label={label} style={{ display: "inline-flex" }}>
                            <Icon size={size} color={color} strokeWidth={2.4} />
                        </span>
                    </Tooltip>
                );
            })}
        </span>
    );
}

/** (platform × durum) kombinasyonları için profil rozetleri. */
const profileBadges: ProfileBadge[] = [];
for (const platform of Object.keys(ICON_PATHS)) {
    for (const [status, hex] of Object.entries(STATUS_HEX)) {
        profileBadges.push({
            id: `mcord-platform-${platform}-${status}`,
            description: `${LABELS[platform] ?? platform} — ${STATUS_LABEL[status] ?? status}`,
            iconSrc: badgeDataUri(platform, hex),
            shouldShow: userId =>
                settings.store.profile === true
                && currentPlatforms(userId)[platform] === status
        });
    }
}

export default definePlugin({
    name: "PlatformIndicators",
    description: "Kullanıcının Discord'a masaüstü, mobil, web veya konsoldan bağlı olduğunu durum renginde gösterir (mesaj, DM, üye listesi, profil)",
    authors: [Devs.Berk],
    tags: ["görünüm", "durum"],
    dependencies: ["MemberListDecoratorsAPI", "MessageDecorationsAPI", "BadgesAPI"],
    settings,
    requiresRestart: false,

    // Ayar değişikliği anında etkili olsun diye dekoratör her zaman ekli;
    // görünürlük render sırasında ayara bakılarak belirleniyor.
    renderMessageDecoration(props: Record<string, any>) {
        return settings.store.messages ? <Indicators user={props?.message?.author} small={false} /> : null;
    },

    start() {
        addMemberListDecorator("PlatformIndicators", props =>
            settings.store.memberList ? <Indicators user={props?.user} small /> : null);

        for (const badge of profileBadges) addProfileBadge(badge);
    },

    stop() {
        removeMemberListDecorator("PlatformIndicators");
        for (const badge of profileBadges) removeProfileBadge(badge);
    }
});
