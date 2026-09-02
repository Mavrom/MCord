/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/** Argüman varsa CLI, yoksa pencere. Alt modüller tembel yüklenir. */

const argv = process.argv.slice(2);
const wantsCli = argv.some(a => a.startsWith("-"));

const started = wantsCli
    ? import("./cli.mjs").then(m => m.runCli(argv))
    : import("./gui/main.mjs").then(m => m.startGui());

started.catch(err => {
    console.error(err);
    process.exitCode = 1;
});
