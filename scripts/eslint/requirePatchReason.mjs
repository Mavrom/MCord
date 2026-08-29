/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/**
 * `patches: [...]` içindeki her patch nesnesinde `reason` alanını zorunlu kılar
 * (plan §5.1).
 *
 * Kod patch'i kırılgan ve geri alınamaz; varsayılan fonksiyon patch'idir. Bu
 * kural tek başına, zamanla kod patch'i sayısını düşürecek en etkili mekanizma —
 * geliştirici gerekçe yazmak zorunda kalınca çoğu zaman fonksiyon patch'iyle
 * çözmenin yolunu buluyor.
 */
const requirePatchReason = {
    meta: {
        type: "problem",
        docs: {
            description: "Kod patch'lerinde `reason` alanını zorunlu kılar"
        },
        schema: [],
        messages: {
            missingReason:
                "Kod patch'i `reason` alanı olmadan yazılamaz. Fonksiyon patch'inin "
                + "neden yetmediğini yaz — yetiyorsa `patcher.after(...)` kullan (plan §5.1).",
            emptyReason:
                "`reason` boş olamaz. Fonksiyon patch'inin neden yetmediğini açıkla."
        }
    },

    create(context) {
        function checkPatchObject(node) {
            if (node.type !== "ObjectExpression") return;

            const reason = node.properties.find(prop =>
                prop.type === "Property"
                && !prop.computed
                && (prop.key.name === "reason" || prop.key.value === "reason"));

            if (!reason) {
                context.report({ node, messageId: "missingReason" });
                return;
            }

            const { value } = reason;
            if (value.type === "Literal" && typeof value.value === "string" && value.value.trim() === "") {
                context.report({ node: value, messageId: "emptyReason" });
            }
        }

        return {
            Property(node) {
                if (node.computed) return;

                const key = node.key.name ?? node.key.value;
                if (key !== "patches") return;

                if (node.value.type === "ArrayExpression") {
                    for (const element of node.value.elements) {
                        if (element) checkPatchObject(element);
                    }
                } else {
                    checkPatchObject(node.value);
                }
            }
        };
    }
};

export default {
    rules: {
        "require-patch-reason": requirePatchReason
    }
};
