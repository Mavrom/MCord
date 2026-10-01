/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { ErrorBoundary } from "../../components/ErrorBoundary";
import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";
import { Constants, FluxDispatcher, RestAPI, UserProfileStore, UserStore, useState } from "../../webpack/common";

const badges: Record<string, { id: string; description: string; icon: string; link?: string; }> = {
    active_developer: { id: "active_developer", description: "Active Developer", icon: "6bdc42827a38498929a4920da12695d9", link: "https://support-dev.discord.com/hc/en-us/articles/10113997751447" },
    bug_hunter_level_1: { id: "bug_hunter_level_1", description: "Discord Bug Hunter", icon: "2717692c7dca7289b35297368a940dd0", link: "https://support.discord.com/hc/en-us/articles/360046057772-Discord-Bugs" },
    bug_hunter_level_2: { id: "bug_hunter_level_2", description: "Discord Bug Hunter", icon: "848f79194d4be5ff5f81505cbd0ce1e6", link: "https://support.discord.com/hc/en-us/articles/360046057772-Discord-Bugs" },
    certified_moderator: { id: "certified_moderator", description: "Moderator Programs Alumni", icon: "fee1624003e2fee35cb398e125dc479b", link: "https://discord.com/safety" },
    discord_employee: { id: "staff", description: "Discord Staff", icon: "5e74e9b61934fc1f67c65515d1f7e60d", link: "https://discord.com/company" },
    get staff() { return this.discord_employee; },
    hypesquad: { id: "hypesquad", description: "HypeSquad Events", icon: "bf01d1073931f921909045f3a39fd264", link: "https://discord.com/hypesquad" },
    hypesquad_online_house_1: { id: "hypesquad_house_1", description: "HypeSquad Bravery", icon: "8a88d63823d8a71cd5e390baa45efa02", link: "https://discord.com/settings/hypesquad-online" },
    hypesquad_online_house_2: { id: "hypesquad_house_2", description: "HypeSquad Brilliance", icon: "011940fd013da3f7fb926e4a1cd2e618", link: "https://discord.com/settings/hypesquad-online" },
    hypesquad_online_house_3: { id: "hypesquad_house_3", description: "HypeSquad Balance", icon: "3aa41de486fa12454c3761e8e223442e", link: "https://discord.com/settings/hypesquad-online" },
    partner: { id: "partner", description: "Partnered Server Owner", icon: "3f9748e53446a137a052f3454e2de41e", link: "https://discord.com/partners" },
    premium: { id: "premium", description: "Subscriber", icon: "2ba85e8026a8614b640c2837bcdfe21b", link: "https://discord.com/settings/premium" },
    premium_early_supporter: { id: "early_supporter", description: "Early Supporter", icon: "7060786766c9c840eb3019e725d2b358", link: "https://discord.com/settings/premium" },
    verified_developer: { id: "verified_developer", description: "Early Verified Bot Developer", icon: "6df5892e0f35b051f8b61eace34f4967" }
};

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

/** Sıralı iş kuyruğu — aynı anda tek istek, en fazla `maxSize` bekleyen iş. */
class Queue {
    private items: (() => Promise<unknown>)[] = [];
    private running = false;

    constructor(private maxSize = Infinity) { }

    unshift(fn: () => Promise<unknown>) {
        if (this.items.length >= this.maxSize) this.items.pop();
        this.items.unshift(fn);
        this.run();
    }

    private async run() {
        if (this.running) return;
        this.running = true;
        while (this.items.length) {
            try { await this.items.shift()!(); } catch { }
        }
        this.running = false;
    }
}

const fetching = new Set<string>();
const queue = new Queue(5);

interface MentionProps {
    data: {
        userId?: string;
        channelId?: string;
        content: any;
    };
    parse: (content: any, props: MentionProps["props"]) => any;
    props: {
        key: string;
        formatInline: boolean;
        noStyleAndInteraction: boolean;
    };
    RoleMention: any;
    UserMention: any;
}

async function getUser(id: string) {
    let userObj = UserStore.getUser(id);
    if (userObj) return userObj;

    // Discord'un kendi RestAPI'si — `discordApi()` bu uç noktada 403 dönüyor.
    const res = await RestAPI.get({ url: Constants.Endpoints.USER(id) });
    const user: any = res.body;

    FluxDispatcher.dispatch({ type: "USER_UPDATE", user });
    // Profili doldur
    await FluxDispatcher.dispatch({ type: "USER_PROFILE_FETCH_FAILURE", userId: id });

    userObj = UserStore.getUser(id);
    const UserFlags = (Constants?.UserFlags ?? {}) as Record<string, number>;
    const fakeBadges = Object.entries(UserFlags)
        .filter(([, flag]) => !isNaN(flag) && userObj?.hasFlag?.(flag))
        .map(([key]) => badges[key.toLowerCase()])
        .filter(Boolean);
    if (user.premium_type || !user.bot && (user.banner || user.avatar?.startsWith?.("a_")))
        fakeBadges.push(badges.premium);

    // Çıkarabildiğimiz kadarını doldur
    const profile = UserProfileStore.getUserProfile(id);
    if (profile) {
        profile.accentColor = user.accent_color;
        profile.badges = fakeBadges;
        profile.banner = user.banner;
        profile.premiumType = user.premium_type;
    }

    return userObj;
}

function MentionWrapper({ data, UserMention, RoleMention, parse, props }: MentionProps) {
    const [userId, setUserId] = useState(data.userId);

    // userId varsa kullanıcı önbellekte. Önbellekte olmayanlarda userId undefined.
    if (userId)
        return (
            <UserMention
                className="mention"
                userId={userId}
                channelId={data.channelId}
                inlinePreview={props.noStyleAndInteraction}
                key={props.key}
            />
        );

    // Ham metin düğümlerini ReactNode[]'a çevirir: ["<@userid>"]
    const children = parse(data.content, props);

    return (
        // Discord bilinmeyen kullanıcı bahsetmelerini rol bahsetmesi olarak render ediyor
        <RoleMention {...data} inlinePreview={props.formatInline}>
            <span
                onMouseEnter={() => {
                    const mention = children?.[0]?.props?.children;
                    if (typeof mention !== "string") return;

                    const id = mention.match(/<@!?(\d+)>/)?.[1];
                    if (!id || fetching.has(id)) return;

                    if (UserStore.getUser(id)) return setUserId(id);

                    const fetch = () => {
                        fetching.add(id);

                        queue.unshift(() =>
                            getUser(id)
                                .then(() => {
                                    setUserId(id);
                                    fetching.delete(id);
                                })
                                .catch(e => {
                                    fetching.delete(id);
                                    if (e?.status === 429) {
                                        const retry = e?.body?.retry_after;
                                        queue.unshift(() => sleep(retry != null ? retry * 1000 : 1000).then(fetch));
                                    }
                                })
                                .finally(() => sleep(300))
                        );
                    };

                    fetch();
                }}
            >
                {children}
            </span>
        </RoleMention>
    );
}

export default definePlugin({
    name: "ValidUser",
    description: "Önbellekte olmayan kullanıcıların bahsetmeleri '<@id>' olarak görünmesin (düzeltmek için bahsetmenin üstüne gel)",
    authors: [Devs.Berk],
    tags: ["bahsetme", "düzeltme"],

    patches: [
        {
            // `className:"mention"` artık üç modülde geçiyor; `"@here"===` yalnız
            // bahsetme kuralının react() rol/kullanıcı ayrımında var.
            find: '"@here"===',
            reason: "Bahsetme kuralının react() fonksiyonu RoleMention/UserMention seçimini burada yapıyor.",
            replacement: {
                // mention = { react: function (data, parse, props) { if (data.userId == null) return RoleMention() else return UserMention()
                match: /react(?=\(\i,\i,\i\).{0,100}return null==.{0,70}\?\(0,\i\.jsx\)\((\i\.\i),.+?jsx\)\((\i\.\i),\{className:"mention")/,
                replace: "react:(...args)=>$self.renderMention($1,$2,...args),originalReact"
            }
        },
        {
            find: "unknownUserMentionPlaceholder:",
            reason: "Bilinmeyen kullanıcıyı '@unknown-user' yer tutucusuyla gizleyen bayrak.",
            replacement: {
                match: /unknownUserMentionPlaceholder:/,
                replace: "$&false&&"
            }
        }
    ],

    renderMention(RoleMention: any, UserMention: any, data: any, parse: any, props: any) {
        return (
            <ErrorBoundary noop>
                <MentionWrapper
                    key={"mention" + data.userId}
                    RoleMention={RoleMention}
                    UserMention={UserMention}
                    data={data}
                    parse={parse}
                    props={props}
                />
            </ErrorBoundary>
        );
    }
});
