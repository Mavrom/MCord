/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { describe, expect, it } from "vitest";

import { listPermissions, type OverwriteLike, permissionLabel, type RoleLike, rolesWithChannelPermission } from "./perms";

const VIEW = 1n << 10n;
const SEND = 1n << 11n;
const ADMIN = 1n << 3n;

const GUILD = "g1";
const everyone: RoleLike = { id: GUILD, name: "@everyone", permissions: VIEW | SEND };
const mod: RoleLike = { id: "r-mod", name: "Mod", permissions: 0n, position: 2 };
const vip: RoleLike = { id: "r-vip", name: "VIP", permissions: 0n, position: 1 };
const admin: RoleLike = { id: "r-admin", name: "Admin", permissions: ADMIN, position: 3 };
const roles = [everyone, mod, vip, admin];

const ow = (id: string, allow: bigint, deny: bigint, type = 0): OverwriteLike => ({ id, type, allow, deny });

describe("rolesWithChannelPermission", () => {
    it("@everyone görebiliyorsa herkes görür", () => {
        expect(rolesWithChannelPermission(GUILD, roles, {}, VIEW)).toEqual({ everyone: true, roles: [] });
    });

    it("@everyone reddedilmiş, rol izinli: yalnız o rol + yönetici", () => {
        const overwrites = {
            [GUILD]: ow(GUILD, 0n, VIEW),
            "r-mod": ow("r-mod", VIEW, 0n)
        };
        const result = rolesWithChannelPermission(GUILD, roles, overwrites, VIEW);
        expect(result.everyone).toBe(false);
        expect(result.roles.map(role => role.id)).toEqual(["r-admin", "r-mod"]);
    });

    it("rol üzerine yazması @everyone reddini geri alır, diğer roller göremez", () => {
        const overwrites = { [GUILD]: ow(GUILD, 0n, VIEW), "r-vip": ow("r-vip", VIEW, 0n) };
        const ids = rolesWithChannelPermission(GUILD, roles, overwrites, VIEW).roles.map(role => role.id);
        expect(ids).toContain("r-vip");
        expect(ids).not.toContain("r-mod");
    });
});

describe("listPermissions / permissionLabel", () => {
    it("açık bitlerin anahtarlarını döndürür", () => {
        expect(listPermissions(VIEW | SEND, { VIEW_CHANNEL: VIEW, SEND_MESSAGES: SEND, ADMINISTRATOR: ADMIN }))
            .toEqual(["VIEW_CHANNEL", "SEND_MESSAGES"]);
    });

    it("bilinmeyen anahtarı okunur yapar", () => {
        expect(permissionLabel("SOME_NEW_PERMISSION")).toBe("Some New Permission");
        expect(permissionLabel("VIEW_CHANNEL")).toBe("Kanalı gör");
    });
});
