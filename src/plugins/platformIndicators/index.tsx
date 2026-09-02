/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { addMemberListDecorator, removeMemberListDecorator } from "../../api/memberListDecorators";
import { definePluginSettings } from "../../api/settings";
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

const labels: Record<string, string> = { desktop: "Masaüstü", mobile: "Mobil", web: "Web", embedded: "Konsol/Oyun", vr: "VR" };

function currentPlatforms(userId: string): Record<string, string> {
    if (userId === UserStore?.getCurrentUser?.()?.id) {
        const sessions = Object.values(SessionsStore?.getSessions?.() ?? {}) as any[];
        return Object.fromEntries(sessions.map(session => [session.clientInfo?.client, session.status]).filter(([client]) => client));
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
    return <span style={{ display: "inline-flex", gap: 2, marginLeft: 4, fontSize: small ? 9 : 11 }}>
        {Object.entries(platforms).map(([platform, status]) => (
            <span key={platform} title={`${labels[platform] ?? platform}: ${status}`} aria-label={labels[platform] ?? platform}>
                {platform === "desktop" ? "▣" : platform === "mobile" ? "▯" : platform === "web" ? "◎" : "◇"}
            </span>
        ))}
    </span>;
}

export default definePlugin({
    name: "PlatformIndicators",
    description: "Kullanıcının Discord'a masaüstü, mobil veya web üzerinden bağlı olduğunu gösterir",
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
