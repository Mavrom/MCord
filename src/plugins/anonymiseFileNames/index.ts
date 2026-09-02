/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { definePluginSettings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import { definePlugin, OptionType } from "../../utils/types";

const ALPHABET = "23456789bdfghjkmnpqrstvwxz";
const settings = definePluginSettings({
    method: {
        type: OptionType.SELECT,
        description: "Anonim dosya adı yöntemi",
        options: [
            { label: "Rastgele", value: "random", default: true },
            { label: "Sabit", value: "fixed" },
            { label: "Zaman damgası", value: "timestamp" }
        ]
    },
    randomLength: {
        type: OptionType.NUMBER,
        description: "Rastgele ad uzunluğu",
        default: 8
    },
    fixedName: {
        type: OptionType.STRING,
        description: "Sabit dosya adı",
        default: "dosya"
    }
});

export default definePlugin({
    name: "AnonymiseFileNames",
    description: "Yüklenen dosyaların özgün adını göndermeden önce anonimleştirir",
    authors: [Devs.Berk],
    tags: ["gizlilik", "dosya"],
    settings,

    patches: [{
        find: "async uploadFiles(",
        reason: "Dosya nesneleri yalnızca uploadFiles metodunun yerel parametre listesinde toplu halde mevcut.",
        replacement: {
            match: /async uploadFiles\((\i)\)\{/,
            replace: "$&$1.forEach($self.renameUpload);"
        }
    }],

    renameUpload(upload: any): void {
        const original = upload?.filename;
        if (typeof original !== "string") return;

        const tarIndex = original.search(/\.tar\.[^.]+$/i);
        const extensionIndex = tarIndex >= 0 ? tarIndex : original.lastIndexOf(".");
        const extension = extensionIndex >= 0 ? original.slice(extensionIndex) : "";

        let base: string;
        if (settings.store.method === "fixed") {
            base = settings.store.fixedName.trim() || "dosya";
        } else if (settings.store.method === "timestamp") {
            base = String(Date.now());
        } else {
            const length = Math.max(3, Math.min(32, Math.floor(settings.store.randomLength)));
            base = Array.from({ length }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");
        }

        upload.filename = `${base}${extension}`;
    }
});
