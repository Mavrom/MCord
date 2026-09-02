/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/** UI sınırına throw etmiyoruz; her dış çağrı bu tipi döndürür. */

export const ok = data => ({ ok: true, data });
export const err = (code, message) => ({ ok: false, code, message });

export const CODES = {
    NO_DISCORD: "NO_DISCORD",
    BRANCH_NOT_FOUND: "BRANCH_NOT_FOUND",
    DISCORD_RUNNING: "DISCORD_RUNNING",
    DISCORD_STILL_RUNNING: "DISCORD_STILL_RUNNING",
    ASAR_NOT_FOUND: "ASAR_NOT_FOUND",
    SOURCE_NOT_FOUND: "SOURCE_NOT_FOUND",
    VERIFY_SIZE: "VERIFY_SIZE",
    VERIFY_SHA: "VERIFY_SHA",
    NOT_INSTALLED: "NOT_INSTALLED",
    INTERNAL: "INTERNAL"
};
