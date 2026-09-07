/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { addMemberListDecorator, removeMemberListDecorator } from "../../api/memberListDecorators";
import { definePluginSettings } from "../../api/settings";
import {
    IconPlatformConsole,
    IconPlatformDesktop,
    IconPlatformMobile,
    IconPlatformWeb
} from "../../components/Icons";
import { Devs } from "../../utils/constants";
import { definePlugin, OptionType } from "../../utils/types";
import { UserStore } from "../../webpack/common";
import { findStoreLazy } from "../../webpack/lazy";
import { React } from "../../webpack/react";

const PresenceStore = findStoreLazy("PresenceStore");
const SessionsStore = findStoreLazy("SessionsStore");

const settings = definePluginSettings({
    memberList: { type: OptionType.BOOLEAN, description: "Üye listesinde göster", default: true },
    messages: { type: OptionType.BOOLEAN, description: "Mesajlarda göster", default: true }
});

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

/** Discord'un durum renkleri — CSS değişkeninden, tema neyse ona uyar. */
const STATUS_COLOR: Record<string, string> = {
    online: "var(--status-online, #23a55a)",
    idle: "var(--status-idle, #f0b232)",
    dnd: "var(--status-dnd, #f23f43)",
    streaming: "var(--status-streaming, #593695)",
    offline: "var(--status-offline, #82858f)",
    invisible: "var(--status-offline, #82858f)"
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

    const size = small ? 15 : 17;

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
                    <span key={platform} title={label} aria-label={label} style={{ display: "inline-flex" }}>
                        <Icon size={size} color={color} strokeWidth={2.4} />
                    </span>
                );
            })}
        </span>
    );
}

export default definePlugin({
    name: "PlatformIndicators",
    description: "Kullanıcının Discord'a masaüstü, mobil, web veya konsoldan bağlı olduğunu durum renginde gösterir",
    authors: [Devs.Berk],
    tags: ["görünüm", "durum"],
    dependencies: ["MemberListDecoratorsAPI", "MessageDecorationsAPI"],
    settings,
    requiresRestart: false,

    renderMessageDecoration(props: Record<string, any>) {
        return settings.store.messages ? <Indicators user={props?.message?.author} small={false} /> : null;
    },

    start() {
        if (settings.store.memberList) {
            addMemberListDecorator("PlatformIndicators", props => <Indicators user={props?.user} small />);
        }
    },

    stop() {
        removeMemberListDecorator("PlatformIndicators");
    }
});
