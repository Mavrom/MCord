/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";
import { findStoreLazy } from "../../webpack/lazy";
import { React } from "../../webpack/react";

const DraftStore = findStoreLazy("DraftStore");

function PreviewButton(props: Record<string, any>) {
    const channelId = props?.channel?.id ?? props?.channelId;
    const read = () => DraftStore?.getDraft?.(channelId, 0) ?? "";
    const [draft, setDraft] = React.useState(read);
    React.useEffect(() => {
        const update = () => setDraft(read());
        DraftStore?.addChangeListener?.(update);
        return () => DraftStore?.removeChangeListener?.(update);
    }, [channelId]);
    if (!channelId || !draft) return null;

    return <button type="button" title="Mesaj önizlemesi" onClick={() => {
        const url = URL.createObjectURL(new Blob([draft], { type: "text/plain;charset=utf-8" }));
        window.open(url, "_blank", "noopener,noreferrer");
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }} style={{ all: "unset", cursor: "pointer", padding: "0 4px", display: "flex" }}>
        <svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M12 5c5.5 0 9.5 5.5 9.5 7S17.5 19 12 19 2.5 13.5 2.5 12 6.5 5 12 5Zm0 2c-3.8 0-6.8 3.4-7.4 5 .6 1.6 3.6 5 7.4 5s6.8-3.4 7.4-5C18.8 10.4 15.8 7 12 7Zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" /></svg>
    </button>;
}

export default definePlugin({
    name: "PreviewMessage",
    description: "Göndermeden önce taslak mesajı ayrı bir önizlemede açar",
    authors: [Devs.Berk],
    tags: ["mesaj", "yardımcı"],
    dependencies: ["ChatComponentsAPI"],
    requiresRestart: false,
    chatBarButton: props => <PreviewButton {...props} />
});
