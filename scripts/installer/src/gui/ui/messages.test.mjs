/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { describe, expect, it } from "vitest";

import { errorText } from "./messages.mjs";

describe("errorText", () => {
    it("bilinen kodu insanca metne çevirir", () => {
        expect(errorText("DISCORD_RUNNING")).toMatch(/Discord açık/);
    });
    it("bilinmeyen kod için genel mesaj döner", () => {
        expect(errorText("WAT")).toBe(errorText("INTERNAL"));
    });
});
