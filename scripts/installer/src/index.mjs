#!/usr/bin/env node
/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/** Argüman varsa CLI, yoksa pencere. */

const argv = process.argv.slice(2);
const wantsCli = argv.some(a => a.startsWith("-"));

if (wantsCli) {
    const { runCli } = await import("./cli.mjs");
    await runCli(argv);
} else {
    await import("./gui/main.mjs");
}
