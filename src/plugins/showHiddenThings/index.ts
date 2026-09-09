/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { Logger } from "../../utils/logger";
import { definePlugin, OptionType } from "../../utils/types";

const logger = new Logger("ShowHiddenThings", "#a6d189");

const settings = definePluginSettings({
    showTimeouts: {
        type: OptionType.BOOLEAN,
        description: "Sohbette üye susturma (timeout) ikonlarını göster",
        default: true,
        restartNeeded: true
    },
    showInvitesPaused: {
        type: OptionType.BOOLEAN,
        description: "Sunucu listesinde 'davetler duraklatıldı' ipucunu göster",
        default: true,
        restartNeeded: true
    },
    showModView: {
        type: OptionType.BOOLEAN,
        description: "Üye moderatör görünümü menüsünü tüm sunucularda göster",
        default: true,
        restartNeeded: true
    }
});

/**
 * Kanıtlanmış açık-kaynak istemcinin (Vencord) `ShowHiddenThings` plugin'inin
 * birebir portu.
 *
 * Eski MCord sürümü `start()` içinde eager `findByKeys("isDeveloper")`
 * kullanıyordu; modül o an yüklü olmadığı için hiç çalışmıyordu ve reporter
 * göremiyordu. Vencord kod patch'leriyle yapıyor — zamanlamadan bağımsız ve
 * CI tarafından doğrulanıyor.
 */
export default definePlugin({
    name: "ShowHiddenThings",
    description: "İzinden bağımsız olarak gizli ve yalnız-moderatör öğelerini gösterir",
    authors: [Devs.Berk],
    tags: ["sunucu", "gelistirici"],
    settings,
    requiresRestart: true,

    patches: [
        {
            find: "showCommunicationDisabledStyles",
            reason: "Susturma ikonu MODERATE_MEMBERS iznine bağlı.",
            predicate: () => settings.store.showTimeouts,
            replacement: {
                match: /&&\i\.\i\.canManageUser\(\i\.\i\.MODERATE_MEMBERS,\i\.author,\i\)/,
                replace: ""
            }
        },
        {
            find: "INVITES_DISABLED)||",
            reason: "'Davetler duraklatıldı' ipucu MANAGE_GUILD iznine bağlı.",
            predicate: () => settings.store.showInvitesPaused,
            replacement: {
                match: /\i\.\i\.can\(\i\.\i.MANAGE_GUILD,\i\)/,
                replace: "true"
            }
        },
        {
            find: /,checkElevated:!1}\),\i\.\i\)}(?<=getCurrentUser\(\);return.+?)/,
            reason: "Moderatör görünümü yükseltilmiş yetki kontrolüne bağlı.",
            predicate: () => settings.store.showModView,
            replacement: {
                match: /return \i\.\i\(\i\.\i\(\{user:\i,context:\i,checkElevated:!1\}\),\i\.\i\)/,
                replace: "return true"
            }
        },
        {
            // Discord en yüksek rolü MemberSafetyStore'dan çekiyor; burada zaten
            // elimizde olan veriden hesaplıyoruz (Üyeler sayfası yüklenmeden de çalışsın).
            find: "#{intl::GUILD_MEMBER_MOD_VIEW_HIGHEST_ROLE}),children:",
            reason: "Moderatör görünümünde en yüksek rol Üyeler sayfası yüklenmeden boş kalıyor.",
            predicate: () => settings.store.showModView,
            replacement: {
                match: /(#{intl::GUILD_MEMBER_MOD_VIEW_HIGHEST_ROLE}.{0,80})role:\i(?<=\[\i\.roles,\i\.highestRoleId,(\i)\].+?)/,
                replace: (_m: string, rest: string, roles: string) =>
                    `${rest}role:$self.getHighestRole(arguments[0],${roles})`
            }
        },
        {
            find: 'action:"PRESS_MOD_VIEW",icon:',
            reason: "Kendi profilinde moderatör görünümü açılabilsin.",
            predicate: () => settings.store.showModView,
            replacement: {
                match: /\i(?=\?null)/,
                replace: "false"
            }
        }
    ],

    getHighestRole({ member }: { member: any }, roles: any[]): any {
        try {
            return roles.find(role => role.id === member.highestRoleId);
        } catch (err) {
            logger.error("En yüksek rol hesaplanamadı:", err);
            return undefined;
        }
    }
});
