/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

export const messageLoggerStyle = `
.mcord-ml-deleted.mcord-ml-text [id^="message-content-"] {
    color: var(--status-danger, #f04747);
}
.mcord-ml-deleted.mcord-ml-overlay {
    background: color-mix(in srgb, var(--status-danger, #f04747) 14%, transparent) !important;
}
.mcord-ml-deleted [class*="buttons_"] { display: none; }
.mcord-ml-deleted :is([class*="imageContainer"], [data-type="sticker"]) { filter: grayscale(1); }
.mcord-ml-collapsed [id^="message-content-"] { display: none; }
.mcord-ml { margin-top: 4px; color: var(--text-muted); font-size: 12px; }
.mcord-ml-toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.mcord-ml-label { color: var(--status-danger, #f04747); }
.mcord-ml button {
    font: inherit; color: var(--text-link); background: transparent; border: 0;
    padding: 2px 4px; cursor: pointer; border-radius: 3px;
}
.mcord-ml button:hover { text-decoration: underline; }
.mcord-ml button:focus-visible { outline: 2px solid var(--text-link); outline-offset: 2px; }
.mcord-ml-edit { margin: 4px 0; padding-left: 8px; border-left: 2px solid var(--text-muted); }
.mcord-ml-content { white-space: pre-wrap; overflow-wrap: anywhere; font: inherit; margin: 4px 0; }
.mcord-ml-edits { max-height: 220px; overflow-y: auto; }
.mcord-ml-attachments { margin: 4px 0; padding-left: 20px; }
.mcord-ml-dialog {
    color: var(--text-normal, #dbdee1); background: var(--background-primary, #313338);
    border: 1px solid var(--background-modifier-accent, #4e5058); border-radius: 10px;
    padding: 20px; width: min(720px, 85vw); max-height: 80vh; overflow: auto;
}
.mcord-ml-dialog::backdrop { background: rgb(0 0 0 / 65%); }
.mcord-ml-dialog h2 { margin: 0; font-size: 20px; color: var(--header-primary, #fff); }
.mcord-ml-dialog-header { display: flex; justify-content: space-between; gap: 16px; align-items: center; }
.mcord-ml-versions { display: flex; flex-wrap: wrap; gap: 6px; margin: 16px 0; }
.mcord-ml-versions button { padding: 6px 8px; background: var(--background-secondary); }
.mcord-ml-versions button[aria-pressed="true"] { outline: 2px solid var(--text-link); }
`;
