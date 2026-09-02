/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { definePlugin, OptionType } from "../../utils/types";
import { React } from "../../webpack/react";

const settings = definePluginSettings({
    format: {
        type: OptionType.SELECT,
        description: "Çağrı süresi gösterimi",
        options: [
            { label: "00:42:15", value: "clock", default: true },
            { label: "42 dk 15 sn", value: "human" }
        ]
    }
});

function formatDuration(milliseconds: number): string {
    const total = Math.max(0, Math.floor(milliseconds / 1000));
    const seconds = total % 60;
    const minutes = Math.floor(total / 60) % 60;
    const hours = Math.floor(total / 3600);
    if (settings.store.format === "human") {
        return `${hours ? `${hours} sa ` : ""}${minutes ? `${minutes} dk ` : ""}${seconds} sn`;
    }
    return [hours, minutes, seconds].map(value => String(value).padStart(2, "0")).join(":");
}

function Timer({ channelId }: { channelId?: string }) {
    const [started, setStarted] = React.useState(Date.now());
    const [now, setNow] = React.useState(Date.now());

    React.useEffect(() => {
        setStarted(Date.now());
        setNow(Date.now());
        const interval = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(interval);
    }, [channelId]);

    return <span style={{ marginLeft: 8, fontFamily: "var(--font-code)", fontSize: 12 }}>{formatDuration(now - started)}</span>;
}

export default definePlugin({
    name: "CallTimer",
    description: "Ses bağlantısı paneline geçen süre sayacı ekler",
    authors: [Devs.Berk],
    tags: ["ses", "yardımcı"],
    settings,

    patches: [{
        find: '"RTCConnectionMenu"',
        reason: "Ses bağlantısı başlığı ek bileşen kancası olmadan inline children alanında oluşturuluyor.",
        replacement: {
            match: /("RTCConnectionMenu".{0,200}?lineClamp:1,children:)(\i)(?=,|}\))/,
            replace: "$1[$2,$self.renderTimer(this?.props?.channel?.id)]"
        }
    }],

    renderTimer(channelId?: string) {
        return <Timer channelId={channelId} />;
    }
});
