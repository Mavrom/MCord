/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/** Vencord `_api/memberListDecorators/style.css` portu. */
export const memberListDecoratorsStyle = `
.mcord-member-list-decorators-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.25em;
}

.mcord-member-list-decorators-wrapper:not(:empty) {
    margin-left: 0.25em;
}

[class*="withDisplayNameStyles"] [class^="name"] {
    flex: initial;
}
`;
