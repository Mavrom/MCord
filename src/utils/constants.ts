/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import type { Author } from "./types";

/** Katkıda bulunanlar. `authors: [Devs.Berk]` şeklinde kullanılıyor. */
export const Devs = Object.freeze({
    Berk: { name: "Berk", id: 0n },
    MCord: { name: "MCord", id: 0n }
} satisfies Record<string, Author>);

export const REPO_URL = "https://github.com/Mavrom/MCord";
export const ISSUES_URL = `${REPO_URL}/issues/new`;
