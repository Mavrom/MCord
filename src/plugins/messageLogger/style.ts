/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

export const messageLoggerStyle = `
/* Silinen mesaj — kırmızı metin + hafif kırmızı zemin. Sınıf <li> satırına
   view.tsx'teki effect ile ekleniyor. */
.mcord-ml-deleted {
    background: color-mix(in srgb, var(--status-danger, #f23f43) 7%, transparent);
}
.mcord-ml-deleted:not(.mcord-ml-unmark):not(.mcord-ml-overlay-style)
    :is([id^="message-content-"], [class*="messageContent_"]) {
    color: var(--text-danger, var(--status-danger, #f23f43));
}
.mcord-ml-deleted.mcord-ml-overlay-style:not(.mcord-ml-unmark) {
    background: color-mix(in srgb, var(--status-danger, #f23f43) 14%, transparent) !important;
}
.mcord-ml-deleted :is([class*="imageContainer"], [data-type="sticker"]) { filter: grayscale(1); }
/* Silinmiş mesaja tepki/yanıt verilemez — hover eylem çubuğunu gizle. */
.mcord-ml-deleted:not(.mcord-ml-unmark) [class*="buttonContainer_"],
.mcord-ml-deleted:not(.mcord-ml-unmark) [class*="buttons_"] { display: none !important; }
.mcord-ml-collapsed [id^="message-content-"] { display: none; }

/* "Silinenleri kaldir" — her mesajda degil, ardisik silinmis grubun SONUNDA.
   :has ile: sonraki kardes li de silinmisse bu son degildir, gizle. */
.mcord-ml-groupclear { display: none; margin: 3px 0 1px; }
li.mcord-ml-deleted:not(.mcord-ml-unmark):not(:has(+ li.mcord-ml-deleted)) .mcord-ml-groupclear {
    display: block;
}
.mcord-ml-forget {
    font: inherit; font-size: 12px; font-weight: 600; line-height: 1.2;
    color: var(--status-danger, #f23f43);
    background: color-mix(in srgb, var(--status-danger, #f23f43) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--status-danger, #f23f43) 35%, transparent);
    border-radius: 4px; padding: 3px 8px; cursor: pointer;
    opacity: .85; transition: opacity .1s, background .1s;
}
.mcord-ml-forget:hover {
    opacity: 1;
    background: color-mix(in srgb, var(--status-danger, #f23f43) 22%, transparent);
}
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
