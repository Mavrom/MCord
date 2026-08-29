/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { type Command, findOption } from "../../../api/commands";
import { showNotification } from "../../../api/notifications";
import { isPluginEnabled, plugins } from "../../../api/PluginManager";
import { Settings } from "../../../api/settings";
import { Devs } from "../../../utils/constants";
import { definePlugin, StartAt } from "../../../utils/types";
import { getBuildNumber, patches } from "../../../webpack/codePatcher";
import { cache } from "../../../webpack/intercept";

/**
 * Destek isterken paylaşılacak tanılama bilgisi.
 *
 * Hiçbir kullanıcı verisi toplamıyor: sadece sürüm, etkin plugin listesi ve
 * patch durumu (plan §0.3).
 */
export function buildSupportInfo(): string {
    const enabled = Object.keys(plugins).filter(isPluginEnabled).sort();
    const version = safe(() => window.McordNative.app.getVersionInfo());
    const injection = safe(() => window.McordNative.injection.getState());

    return [
        "**MCord Destek Bilgisi**",
        `- MCord: \`${VERSION}\` (\`${COMMIT_HASH}\`)`,
        `- Build: \`${new Date(BUILD_TIMESTAMP).toISOString()}\``,
        `- Discord build: \`${getBuildNumber()}\``,
        `- Discord klasörü: \`${injection?.currentVersion ?? "?"}\``
        + (injection?.isOutdated ? ` (en yeni: \`${injection.latestVersion}\`)` : ""),
        `- Electron: \`${version?.electronVersion ?? "?"}\` / Chrome: \`${version?.chromeVersion ?? "?"}\``,
        `- Yüklü modül: \`${Object.keys(cache ?? {}).length}\``,
        `- Uygulanmamış kod patch'i: \`${patches.filter(p => !p.all).length}\``,
        `- Güvenli mod: \`${Settings.safeMode}\``,
        "",
        `**Etkin pluginler (${enabled.length})**`,
        enabled.length > 0 ? enabled.map(name => `\`${name}\``).join(", ") : "_yok_"
    ].join("\n");
}

const supportCommand: Command = {
    name: "mcord-destek",
    description: "MCord tanılama bilgisini üretir",
    options: [],
    execute(args) {
        const send = findOption<boolean>(args, "gonder", false);
        const info = buildSupportInfo();

        if (!send) {
            void navigator.clipboard.writeText(info).then(() =>
                showNotification({
                    title: "Destek bilgisi kopyalandı",
                    body: "Panoya yazıldı; destek kanalına yapıştırabilirsin.",
                    color: "#8caaee"
                }));
            return;
        }

        return { content: info };
    }
};

export default definePlugin({
    name: "SupportInfo",
    description: "Destek isterken paylaşılacak tanılama bilgisini üretir",
    authors: [Devs.MCord],
    required: true,
    startAt: StartAt.WebpackReady,
    dependencies: ["CommandsAPI"],
    commands: [supportCommand]
});

function safe<T>(fn: () => T): T | null {
    try {
        return fn();
    } catch {
        return null;
    }
}
