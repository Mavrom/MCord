/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { c, radius, s, shadow, space } from "../../components/theme";
import { ChannelStore, GuildMemberStore, GuildRoleStore, PermissionsBits, PermissionStore, UserStore } from "../../webpack/common";
import { getReactDOMClient, React } from "../../webpack/react";
import {
    listPermissions,
    type OverwriteLike,
    permissionLabel,
    type RoleLike,
    rolesWithChannelPermission
} from "./perms";

const CONTAINER_ID = "mcord-permissions-modal";

export type View =
    | { kind: "channel"; channelId: string }
    | { kind: "guild"; guildId: string }
    | { kind: "user"; guildId: string; userId: string };

const ALL_BITS = (): Record<string, bigint> => (PermissionsBits ?? {}) as Record<string, bigint>;

function getRoles(guildId: string): RoleLike[] {
    const roles = GuildRoleStore?.getRoles?.(guildId) ?? {};
    return Object.values<any>(roles);
}

function roleColor(role: RoleLike): string | undefined {
    if (role.colorString) return role.colorString;
    return role.color ? `#${role.color.toString(16).padStart(6, "0")}` : undefined;
}

function canView(channel: any, bit: bigint | undefined): boolean {
    return bit != null && PermissionStore.can(bit, channel) === true;
}

function channelName(channel: any): string {
    const prefix = channel.type === 2 || channel.type === 13 ? "🔊 " : "# ";
    return `${prefix}${channel.name ?? channel.id}`;
}

// ── Küçük parçalar ──────────────────────────────────────────────────────────

function Chip({ ok, children }: { ok: boolean; children: React.ReactNode }) {
    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "2px 8px",
                borderRadius: radius.pill,
                fontSize: "12px",
                fontWeight: 600,
                color: ok ? c.success : c.danger,
                background: ok ? "rgba(35, 165, 90, .14)" : "rgba(218, 55, 60, .14)",
                whiteSpace: "nowrap"
            }}
        >
            {ok ? "✓" : "✕"} {children}
        </span>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: space.sm }}>
            <div style={{ ...s.faint, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase" }}>{title}</div>
            {children}
        </div>
    );
}

function RoleTag({ role }: { role: RoleLike }) {
    const color = roleColor(role);
    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "2px 8px",
                borderRadius: radius.pill,
                fontSize: "12px",
                color: c.text,
                border: `1px solid ${c.border}`,
                background: c.surfaceRaised
            }}
        >
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: color ?? c.muted }} />
            {role.name}
        </span>
    );
}

function Wrap({ children }: { children: React.ReactNode }) {
    return <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>{children}</div>;
}

// ── Görünümler ──────────────────────────────────────────────────────────────

function ChannelView({ channelId }: { channelId: string }) {
    const channel = ChannelStore.getChannel(channelId);
    if (!channel?.guild_id) return <div style={s.muted}>Kanal bulunamadı.</div>;

    const guildId: string = channel.guild_id;
    const roles = getRoles(guildId);
    const bits = ALL_BITS();
    const overwrites: Record<string, OverwriteLike> = channel.permissionOverwrites ?? {};

    const viewers = rolesWithChannelPermission(guildId, roles, overwrites, bits.VIEW_CHANNEL);
    const memberViewers = Object.values(overwrites)
        .filter(overwrite => overwrite.type === 1 && (BigInt(overwrite.allow) & bits.VIEW_CHANNEL) === bits.VIEW_CHANNEL);

    const mine = Object.entries(bits)
        .filter(([, bit]) => typeof bit === "bigint" && bit !== 0n)
        .filter(([key]) => !["ADMINISTRATOR", "KICK_MEMBERS", "BAN_MEMBERS", "MANAGE_GUILD", "VIEW_AUDIT_LOG", "VIEW_GUILD_ANALYTICS",
            "CHANGE_NICKNAME", "MANAGE_NICKNAMES", "MANAGE_GUILD_EXPRESSIONS", "MODERATE_MEMBERS"].includes(key))
        .map(([key, bit]) => ({ key, ok: canView(channel, bit) }));
    const hidden = !canView(channel, bits.VIEW_CHANNEL);

    const entries = Object.values(overwrites)
        .map(overwrite => {
            const role = overwrite.type === 0 ? roles.find(r => r.id === overwrite.id) : undefined;
            const user = overwrite.type === 1 ? UserStore.getUser(overwrite.id) : undefined;
            return {
                overwrite,
                label: role?.name ?? (overwrite.id === guildId ? "@everyone" : user?.username ?? overwrite.id),
                kind: overwrite.type === 1 ? "Üye" : "Rol",
                role
            };
        })
        .sort((a, b) => a.label.localeCompare(b.label));

    return (
        <>
            {hidden && (
                <div style={{ ...s.muted, padding: space.md, borderRadius: radius.md, background: c.surfaceRaised }}>
                    🔒 Bu kanalı görme iznin yok — ama izin yapısı aşağıda.
                </div>
            )}

            <Section title="Bu kanalı kimler görebilir">
                {viewers.everyone
                    ? <div style={s.muted}>Herkes (@everyone).</div>
                    : (
                        <Wrap>
                            {viewers.roles.map(role => <RoleTag key={role.id} role={role} />)}
                            {memberViewers.map(overwrite => (
                                <span key={overwrite.id} style={{ ...s.muted, fontSize: "12px" }}>
                                    👤 {UserStore.getUser(overwrite.id)?.username ?? overwrite.id}
                                </span>
                            ))}
                            {viewers.roles.length === 0 && memberViewers.length === 0 && (
                                <span style={s.muted}>Yalnızca yöneticiler.</span>
                            )}
                        </Wrap>
                    )}
                {hidden && !viewers.everyone && viewers.roles.length > 0 && (
                    <div style={{ ...s.faint }}>
                        Görmek için bu rollerden birine sahip olmalısın (yönetici rolü zaten tüm kanalları görür).
                    </div>
                )}
            </Section>

            <Section title="Senin bu kanaldaki izinlerin">
                <Wrap>{mine.map(item => <Chip key={item.key} ok={item.ok}>{permissionLabel(item.key)}</Chip>)}</Wrap>
            </Section>

            <Section title={`İzin üzerine yazmaları (${entries.length})`}>
                {entries.length === 0 && <div style={s.muted}>Bu kanala özel izin üzerine yazması yok; kategoriden/sunucudan miras alır.</div>}
                {entries.map(({ overwrite, label, kind, role }) => {
                    const allow = listPermissions(BigInt(overwrite.allow), bits);
                    const deny = listPermissions(BigInt(overwrite.deny), bits);
                    return (
                        <div
                            key={overwrite.id}
                            style={{ display: "flex", flexDirection: "column", gap: "6px", padding: space.md, borderRadius: radius.md, background: c.surfaceRaised }}
                        >
                            <div style={{ color: c.heading, fontWeight: 600, display: "flex", gap: space.sm, alignItems: "center" }}>
                                {role ? <RoleTag role={role} /> : label}
                                <span style={{ ...s.faint }}>{kind}</span>
                            </div>
                            <Wrap>
                                {allow.map(key => <Chip key={`a-${key}`} ok>{permissionLabel(key)}</Chip>)}
                                {deny.map(key => <Chip key={`d-${key}`} ok={false}>{permissionLabel(key)}</Chip>)}
                                {allow.length === 0 && deny.length === 0 && <span style={s.muted}>Boş</span>}
                            </Wrap>
                        </div>
                    );
                })}
            </Section>
        </>
    );
}

function GuildView({ guildId, open }: { guildId: string; open(view: View): void }) {
    const bits = ALL_BITS();
    const channels: any[] = Object.values(ChannelStore.getMutableGuildChannelsForGuild?.(guildId) ?? {});
    const categories = channels.filter(channel => channel.type === 4).sort((a, b) => a.position - b.position);
    const byParent = (parentId: string | null) => channels
        .filter(channel => channel.type !== 4 && (channel.parent_id ?? null) === parentId)
        .sort((a, b) => a.position - b.position);

    const groups = [
        { id: null as string | null, name: "Kategorisiz", items: byParent(null) },
        ...categories.map(category => ({ id: category.id as string, name: category.name as string, items: byParent(category.id) }))
    ].filter(group => group.items.length > 0);

    const hiddenCount = channels.filter(channel => channel.type !== 4 && !canView(channel, bits.VIEW_CHANNEL)).length;

    return (
        <>
            <div style={s.muted}>
                {channels.filter(channel => channel.type !== 4).length} kanal, {hiddenCount} tanesini göremiyorsun. Ayrıntı için bir kanala tıkla.
            </div>
            {groups.map(group => (
                <Section key={group.id ?? "none"} title={group.name}>
                    {group.items.map(channel => {
                        const isVoice = channel.type === 2 || channel.type === 13;
                        const view = canView(channel, bits.VIEW_CHANNEL);
                        return (
                            <button
                                key={channel.id}
                                type="button"
                                onClick={() => open({ kind: "channel", channelId: channel.id })}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: space.sm,
                                    padding: `6px ${space.md}`,
                                    borderRadius: radius.sm,
                                    border: "none",
                                    background: view ? c.surfaceRaised : "rgba(218, 55, 60, .08)",
                                    color: c.text,
                                    cursor: "pointer",
                                    textAlign: "left",
                                    fontFamily: "inherit"
                                }}
                            >
                                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {view ? "" : "🔒 "}{channelName(channel)}
                                </span>
                                <Chip ok={view}>Gör</Chip>
                                {!isVoice && <Chip ok={canView(channel, bits.SEND_MESSAGES)}>Yaz</Chip>}
                                {isVoice && <Chip ok={canView(channel, bits.CONNECT)}>Bağlan</Chip>}
                            </button>
                        );
                    })}
                </Section>
            ))}
        </>
    );
}

function UserView({ guildId, userId }: { guildId: string; userId: string }) {
    const bits = ALL_BITS();
    const roles = getRoles(guildId);
    const member = GuildMemberStore?.getMember?.(guildId, userId);
    const memberRoles = [guildId, ...(member?.roles ?? [])]
        .map(id => roles.find(role => role.id === id))
        .filter((role): role is RoleLike => role != null)
        .sort((a, b) => (b.position ?? 0) - (a.position ?? 0));

    const total = memberRoles.reduce((acc, role) => acc | BigInt(role.permissions ?? 0n), 0n);
    const isAdmin = (total & PermissionsBits.ADMINISTRATOR) === PermissionsBits.ADMINISTRATOR;
    const granted = listPermissions(total, bits);

    return (
        <>
            <Section title={`Roller (${memberRoles.length})`}>
                <Wrap>{memberRoles.map(role => <RoleTag key={role.id} role={role} />)}</Wrap>
            </Section>
            <Section title="Sunucu izinleri (rollerin birleşimi)">
                {isAdmin && <div style={{ color: c.warning, fontWeight: 600 }}>Yönetici — tüm izinler ve kanal kısıtlamaları aşılır.</div>}
                <Wrap>{granted.map(key => <Chip key={key} ok>{permissionLabel(key)}</Chip>)}</Wrap>
                {granted.length === 0 && <div style={s.muted}>Açık izin yok.</div>}
            </Section>
        </>
    );
}

// ── Kabuk ───────────────────────────────────────────────────────────────────

function titleOf(view: View): string {
    if (view.kind === "channel") {
        const channel = ChannelStore.getChannel(view.channelId);
        return channel ? `İzinler — ${channelName(channel)}` : "İzinler";
    }
    if (view.kind === "guild") return "Sunucu izin haritası";
    return `Üye izinleri — ${UserStore.getUser(view.userId)?.username ?? view.userId}`;
}

function PermissionsModal({ initial, onClose }: { initial: View; onClose(): void }) {
    const [stack, setStack] = React.useState<View[]>([initial]);
    const view = stack[stack.length - 1];

    React.useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.stopPropagation();
                onClose();
            }
        };
        window.addEventListener("keydown", onKey, true);
        return () => window.removeEventListener("keydown", onKey, true);
    }, []);

    const open = (next: View) => setStack(prev => [...prev, next]);

    return (
        <div
            onMouseDown={onClose}
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 100050,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0, 0, 0, .5)",
                padding: space.xl
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                onMouseDown={event => event.stopPropagation()}
                style={{
                    display: "flex",
                    flexDirection: "column",
                    width: "min(640px, 100%)",
                    maxHeight: "min(720px, 90vh)",
                    background: c.surface,
                    border: `1px solid ${c.border}`,
                    borderRadius: radius.lg,
                    boxShadow: shadow.high,
                    overflow: "hidden"
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: space.sm, padding: `${space.md} ${space.lg}`, borderBottom: `1px solid ${c.border}` }}>
                    {stack.length > 1 && (
                        <button
                            type="button"
                            onClick={() => setStack(prev => prev.slice(0, -1))}
                            style={{ ...s.button, padding: "4px 10px" }}
                        >
                            ← Geri
                        </button>
                    )}
                    <div style={{ flex: 1, minWidth: 0, color: c.heading, fontWeight: 700, fontSize: "16px" }}>{titleOf(view)}</div>
                    <button type="button" onClick={onClose} aria-label="Kapat" style={{ ...s.button, padding: "4px 10px" }}>✕</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: space.lg, padding: space.lg, overflowY: "auto", minHeight: 0 }}>
                    {view.kind === "channel" && <ChannelView channelId={view.channelId} />}
                    {view.kind === "guild" && <GuildView guildId={view.guildId} open={open} />}
                    {view.kind === "user" && <UserView guildId={view.guildId} userId={view.userId} />}
                </div>
            </div>
        </div>
    );
}

let root: { unmount(): void } | null = null;

export function openPermissionsModal(initial: View): void {
    if (root != null) return;

    const container = document.createElement("div");
    container.id = CONTAINER_ID;
    document.body.appendChild(container);

    const close = () => {
        root?.unmount();
        container.remove();
        root = null;
    };

    try {
        const created = getReactDOMClient().createRoot(container);
        created.render(<PermissionsModal initial={initial} onClose={close} />);
        root = { unmount: () => created.unmount() };
    } catch {
        container.remove();
        root = null;
    }
}
