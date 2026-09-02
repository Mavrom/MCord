/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/**
 * pkg konsol (CUI) exe üretiyor → çift tıklamada siyah terminal açılıyor.
 * PE başlığındaki Subsystem alanını GUI'ye (2) çeviriyoruz → terminal yok.
 *
 * Subsystem WORD'ü hem PE32 hem PE32+ için optional header başından +68'de.
 */

import { readFileSync, writeFileSync } from "node:fs";

const path = process.argv[2];
if (!path) {
    console.error("kullanım: node patch-exe.mjs <exe>");
    process.exit(1);
}

const buf = readFileSync(path);
const peOff = buf.readUInt32LE(0x3c);
if (buf.toString("ascii", peOff, peOff + 4) !== "PE\0\0") {
    console.error("[MCord] geçerli bir PE dosyası değil");
    process.exit(1);
}

const SUBSYSTEM_OFF = peOff + 4 + 20 + 68; // sig + COFF header + optional header offset
const CUI = 3;
const GUI = 2;
const current = buf.readUInt16LE(SUBSYSTEM_OFF);

if (current === GUI) {
    console.log("[MCord] exe zaten GUI subsystem");
} else if (current === CUI) {
    buf.writeUInt16LE(GUI, SUBSYSTEM_OFF);
    writeFileSync(path, buf);
    console.log("[MCord] exe subsystem: konsol → pencere (terminal açılmayacak)");
} else {
    console.error(`[MCord] beklenmeyen subsystem değeri: ${current} — dokunulmadı`);
    process.exit(1);
}
