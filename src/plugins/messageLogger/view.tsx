/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Logger } from "../../utils/logger";
import { React } from "../../webpack/react";
import type { MessageHistoryEntry } from "./history";
import { history } from "./runtime";
import { settings } from "./settings";

const logger = new Logger("MessageLogger", "#a6d189");
/** Satır sınıflarından bizim yönettiklerimiz — `mcord-ml-deleted` patch'e ait, dokunmuyoruz. */
const modifierClasses = ["mcord-ml-unmark", "mcord-ml-overlay-style", "mcord-ml-collapsed"];

function attachmentUrl(value: string): string | undefined {
    try {
        const url = new URL(value);
        if (url.protocol === "https:" && ["cdn.discordapp.com", "media.discordapp.net"].includes(url.hostname)) return url.href;
    } catch { /* Erişilemeyen eski ek, yalnız dosya adı olarak gösterilir. */ }
}

function timestamp(value: number): string {
    return new Date(value).toLocaleString();
}

export function MessageEditMarker({ message, children, ...props }: any) {
    const hasHistory = (history.get(message?.channel_id, message?.id)?.edits.length ?? 0) > 0;
    const open = () => document.getElementById(`mcord-history-${message?.channel_id}-${message?.id}`)?.click();
    return <span {...props} role={hasHistory ? "button" : undefined} tabIndex={hasHistory ? 0 : undefined}
        title={hasHistory ? "Yerel düzenleme geçmişini göster" : undefined}
        onClick={event => { if (hasHistory) { event.stopPropagation(); open(); } }}
        onKeyDown={event => {
            if (hasHistory && (event.key === "Enter" || event.key === " ")) {
                event.preventDefault();
                event.stopPropagation();
                open();
            }
        }}>
        {children}
    </span>;
}

function EditHistoryDialog({ entry, onClose }: { entry: MessageHistoryEntry; onClose(): void }) {
    const ref = React.useRef<HTMLDialogElement>(null);
    const [selected, setSelected] = React.useState<number | null>(null);
    const titleId = React.useId();
    const current = { content: entry.content, timestamp: entry.timestamp };
    const version = selected == null ? current : entry.edits[selected] ?? current;

    React.useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;
        try {
            dialog.showModal();
        } catch {
            logger.warn("Yerel geçmiş penceresi açılamadı.");
            onClose();
        }
        return () => { if (dialog.open) dialog.close(); };
    }, [onClose]);

    return <dialog ref={ref} className="mcord-ml-dialog" aria-labelledby={titleId} onClose={onClose} onClick={event => event.stopPropagation()}>
        <div className="mcord-ml-dialog-header">
            <h2 id={titleId}>Mesajın düzenleme geçmişi</h2>
            <button type="button" onClick={onClose} aria-label="Geçmiş penceresini kapat">Kapat</button>
        </div>
        <p>Yalnızca bu istemcide kayıtlı sürümler. Bu pencere mesaj göndermez.</p>
        <div className="mcord-ml-versions" role="group" aria-label="Kaydedilmiş mesaj sürümleri">
            {entry.edits.map((edit, index) => <button key={`${edit.timestamp}:${index}`} type="button" aria-pressed={selected === index} onClick={() => setSelected(index)}>
                {index + 1}. sürüm · {timestamp(edit.timestamp)}
            </button>)}
            <button type="button" aria-pressed={selected == null} onClick={() => setSelected(null)}>Son sürüm · {timestamp(entry.timestamp)}</button>
        </div>
        <pre className="mcord-ml-content">{version.content || "(Metin yok)"}</pre>
    </dialog>;
}

export function MessageHistoryView({ channelId, messageId }: { channelId: string; messageId: string }) {
    const subscribe = React.useCallback((listener: () => void) => history.subscribe(channelId, messageId, listener), [channelId, messageId]);
    const snapshot = React.useCallback(() => history.get(channelId, messageId), [channelId, messageId]);
    const entry = React.useSyncExternalStore(subscribe, snapshot, snapshot);
    const [open, setOpen] = React.useState(false);
    const [expanded, setExpanded] = React.useState(false);
    const close = React.useCallback(() => setOpen(false), []);
    const deleteStyle = settings.store.deleteStyle;
    const deleted = entry?.deleted === true;
    const collapsed = deleted && settings.store.collapseDeleted && !expanded;
    const unmarked = deleted && !entry!.highlight;
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        // Kırmızı sınıfı `<li>`'ye patch ekliyor; burada sadece kullanıcının
        // aç/kapattığı vurgu ve stil değişkenlerini yönetiyoruz. Satırı ref'ten
        // (accessory mesajın içinde) buluyoruz, id tahminine güvenmiyoruz.
        const row = containerRef.current?.closest("li")
            ?? document.getElementById(`chat-messages-${channelId}-${messageId}`);
        if (!row) return;
        row.classList.toggle("mcord-ml-deleted", deleted);
        row.classList.toggle("mcord-ml-unmark", unmarked);
        row.classList.toggle("mcord-ml-overlay-style", deleted && deleteStyle === "overlay");
        row.classList.toggle("mcord-ml-collapsed", collapsed);
        return () => row.classList.remove(...modifierClasses);
    }, [channelId, messageId, deleted, unmarked, collapsed, deleteStyle]);

    if (!entry) return null;
    return <div className="mcord-ml" ref={containerRef} onClick={event => event.stopPropagation()}>
        <div className="mcord-ml-toolbar">
            {entry.deleted ? <span className="mcord-ml-label">Silindi · yalnızca sende görünüyor</span> : null}
            {entry.deleted && settings.store.collapseDeleted ? <button type="button" aria-expanded={!collapsed} onClick={() => setExpanded(value => !value)}>
                {collapsed ? "Mesajı göster" : "Mesajı daralt"}
            </button> : null}
            {entry.edits.length > 0 ? <button id={`mcord-history-${channelId}-${messageId}`} type="button" onClick={() => setOpen(true)}>
                Düzenlendi · {entry.edits.length} önceki sürüm
            </button> : null}
            <button type="button" onClick={() => history.forget(channelId, messageId)}>Yerel geçmişi temizle</button>
        </div>
        {settings.store.inlineEdits && !collapsed && entry.edits.length > 0 ? <div className="mcord-ml-edits">
            {entry.edits.map((edit, index) => <div className="mcord-ml-edit" key={`${edit.timestamp}:${index}`}>
                <time dateTime={new Date(edit.timestamp).toISOString()}>{timestamp(edit.timestamp)} · önceki içerik</time>
                <div className="mcord-ml-content">{edit.content || "(Metin yok)"}</div>
            </div>)}
        </div> : null}
        {!collapsed && entry.attachments.length > 0 ? <ul className="mcord-ml-attachments" aria-label="Mesajdan kaldırılmış ekler">
            {entry.attachments.map(attachment => {
                const url = attachmentUrl(attachment.url);
                return <li key={attachment.id}>Silinen ek: {url
                    ? <a href={url} target="_blank" rel="noopener noreferrer">{attachment.filename}</a>
                    : <span>{attachment.filename}</span>}</li>;
            })}
        </ul> : null}
        {open ? <EditHistoryDialog entry={entry} onClose={close} /> : null}
    </div>;
}
