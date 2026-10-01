/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Devs } from "../../utils/constants";
import { definePlugin } from "../../utils/types";

export default definePlugin({
    name: "NoOnboardingDelay",
    description: "Sunucu karşılama ekranındaki yapay bekleme süresini kaldırır",
    authors: [Devs.Berk],
    tags: ["sunucu", "hız"],

    patches: [{
        find: "#{intl::ONBOARDING_COVER_WELCOME_SUBTITLE}",
        reason: "Karşılama ekranının sabit üç saniyelik gecikmesi yalnızca modül yüklenirken değiştirilebilir.",
        replacement: {
            // Geri çağırma artık virgüllü bir ok fonksiyonu (`()=>{a=!0,b()}`):
            // `[^,]` gövdeyi aşamıyordu. Modülde tek `3e3` var (Vencord düz
            // "3e3" kullanıyor); yanlış yere oturmasın diye yine setTimeout'un
            // süre argümanına sabitliyoruz.
            match: /(?<=setTimeout\(\(\)=>\{[^{}]{0,200}\},)3e3(?=\))/,
            replace: "0"
        }
    }]
});
