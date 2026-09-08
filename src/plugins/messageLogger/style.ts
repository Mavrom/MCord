/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

export const messageLoggerStyle = `
/* Silinen mesaj — varsayılan: kırmızı metin + hafif kırmızı zemin + çöp ikonu.
   Sınıf artık doğrudan <li> satırına patch'le ekleniyor (referans katalog gibi). */
.mcord-ml-deleted {
    position: relative;
    background: color-mix(in srgb, var(--status-danger, #f23f43) 7%, transparent);
}
.mcord-ml-deleted:not(.mcord-ml-unmark):not(.mcord-ml-overlay-style)
    :is([id^="message-content-"], [class*="messageContent_"]) {
    color: var(--text-danger, var(--status-danger, #f23f43));
}
.mcord-ml-deleted.mcord-ml-overlay-style:not(.mcord-ml-unmark) {
    background: color-mix(in srgb, var(--status-danger, #f23f43) 14%, transparent) !important;
}
/* Çöp ikonu — satırın sağ üstünde, tema tehlike rengiyle */
.mcord-ml-deleted:not(.mcord-ml-unmark)::after {
    content: "";
    position: absolute;
    top: 3px;
    right: 10px;
    width: 15px;
    height: 15px;
    background-color: var(--status-danger, #f23f43);
    -webkit-mask: var(--mcord-ml-trash) center / contain no-repeat;
    mask: var(--mcord-ml-trash) center / contain no-repeat;
    opacity: .85;
    pointer-events: none;
}
.mcord-ml-deleted {
    --mcord-ml-trash: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M9 3v1H4v2h16V4h-5V3H9zm-3 5 1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12H6zm4 2h1v9h-1v-9zm3 0h1v9h-1v-9z'/%3E%3C/svg%3E");
}
.mcord-ml-deleted:not(.mcord-ml-unmark) [class*="buttons_"] { opacity: .4; }
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
