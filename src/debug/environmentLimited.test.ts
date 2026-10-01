/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { describe, expect, it } from "vitest";

import { ENVIRONMENT_LIMITED_FINDS, ENVIRONMENT_LIMITED_STORES, isEnvironmentLimitedDescription, isEnvironmentLimitedLabel, isEnvironmentLimitedStore } from "./environmentLimited";

describe("ortam kısıtlı işaretleme", () => {
    it("store etiketlerini tanır", () => {
        for (const name of ENVIRONMENT_LIMITED_STORES) {
            expect(isEnvironmentLimitedStore(name)).toBe(true);
            expect(isEnvironmentLimitedLabel(`store: ${name}`)).toBe(true);
        }
        expect(isEnvironmentLimitedLabel("store: ReadStateStore")).toBe(true);
        expect(isEnvironmentLimitedLabel("store: UserStore")).toBe(false);
        // Önek olmadan düz ad bir arama etiketi sayılır, store değil.
        expect(isEnvironmentLimitedLabel("ReadStateStore")).toBe(false);
    });

    it("byKeys aramalarını describeFilter biçimiyle tanır", () => {
        expect(isEnvironmentLimitedLabel('byKeys("clearCache", "_channelMessages")')).toBe(true);
        expect(isEnvironmentLimitedDescription('byKeys("useDefaultUserSettingsSections")')).toBe(true);
        expect(isEnvironmentLimitedLabel('byKeys("clearCache")')).toBe(false);
        expect(isEnvironmentLimitedLabel('byProps("clearCache", "_channelMessages")')).toBe(false);
        for (const d of ENVIRONMENT_LIMITED_FINDS) expect(isEnvironmentLimitedLabel(d)).toBe(true);
    });

    it("hata etiketlerini kısıtlı saymaz", () => {
        expect(isEnvironmentLimitedLabel("findLazy: doğrulama hata verdi — Error: x")).toBe(false);
    });
});
