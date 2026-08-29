/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/**
 * main ↔ renderer arasındaki IPC kanal adları.
 * Tek kaynak: iki taraf da bu enum'u import eder, string kaçmaz.
 */
export const enum IpcEvents {
    GET_RENDERER_SCRIPT = "McordGetRendererScript",

    GET_SETTINGS_DIR = "McordGetSettingsDir",
    GET_SETTINGS = "McordGetSettings",
    SET_SETTINGS = "McordSetSettings",

    GET_VERSION_INFO = "McordGetVersionInfo",

    OPEN_EXTERNAL = "McordOpenExternal",
    OPEN_SETTINGS_FOLDER = "McordOpenSettingsFolder",

    RELAUNCH = "McordRelaunch",

    /** Discord host güncellemesi sonrası enjeksiyon durumu (plan §3.6) */
    GET_INJECTION_STATE = "McordGetInjectionState",
    REPATCH_LATEST = "McordRepatchLatest",

    /** Mod güncellemesi (plan §10.1) */
    GET_PENDING_UPDATE = "McordGetPendingUpdate",
    DOWNLOAD_UPDATE = "McordDownloadUpdate",
    DISCARD_UPDATE = "McordDiscardUpdate"
}
