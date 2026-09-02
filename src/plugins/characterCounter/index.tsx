/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { definePlugin, OptionType } from "../../utils/types";
import { UserStore } from "../../webpack/common";

const settings = definePluginSettings({
    colorEffects: {
        type: OptionType.BOOLEAN,
        description: "Sınıra yaklaştıkça sayacı sarı ve kırmızı renklendir",
        default: true
    }
});

function counterColor(ratio: number): string {
    if (!settings.store.colorEffects || ratio < 0.5) return "var(--text-muted)";
    if (ratio < 0.75) return "var(--status-warning)";
    if (ratio < 0.9) return "var(--orange-345)";
    return "var(--status-danger)";
}

export default definePlugin({
    name: "CharacterCounter",
    description: "Sohbet kutusuna kullanılan ve azami karakter sayısını ekler",
    authors: [Devs.Berk],
    tags: ["mesaj", "yardımcı"],
    settings,

    patches: [{
        find: ".CREATE_FORUM_POST||",
        reason: "Sohbet editörünün metni ve alt aksesuarları yalnız derlenmiş giriş bileşeninin yerel değişkenlerinde bulunuyor.",
        replacement: {
            match: /(?<=,editorRef:(\i),.{0,200}textValue:(\i),editorHeight:\i,channelId:\i\.id\}\)),\i/,
            replace: ",$self.renderCounter($2)"
        }
    }],

    renderCounter(text: string) {
        if (typeof text !== "string" || text.length === 0) return null;
        const limit = UserStore?.getCurrentUser?.()?.premiumType === 2 ? 4000 : 2000;
        return (
            <div style={{ color: counterColor(text.length / limit), fontSize: 12, marginLeft: "auto", padding: "0 8px 4px" }}>
                {text.length}/{limit}
            </div>
        );
    }
});
