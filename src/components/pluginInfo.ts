/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { pluginRequiresRestart } from "../api/PluginManager";
import type { Plugin } from "../utils/types";

/**
 * "Nasıl çalışır" metni. Plugin `details` yazmışsa onu, yazmamışsa tanımından
 * (patch sayısı, komutlar, kancalar, API bağımlılıkları) türetilen genel bir
 * açıklamayı döndürür.
 */
export function howItWorks(plugin: Plugin): string {
    if (plugin.details) return plugin.details;

    const parts: string[] = [];
    const patchCount = plugin.patches?.length ?? 0;

    if (patchCount > 0) {
        parts.push(
            `Discord açılırken ${patchCount} yerine kod yaması uyguluyor; bu yüzden `
            + "aç/kapattıktan sonra yeniden başlatma gerekir."
        );
    } else {
        parts.push(
            "Kod yaması yok — Discord'un modüllerini ve olaylarını okuyup arayüze "
            + "öğe ekliyor ya da mevcut davranışı değiştiriyor."
        );
    }

    if ((plugin.commands?.length ?? 0) > 0) {
        parts.push(`${plugin.commands!.length} eğik çizgi (/) komutu ekliyor.`);
    }
    if (plugin.renderMessageDecoration) parts.push("Mesajda yazar adının yanına küçük bir gösterge koyuyor.");
    if (plugin.renderMessageAccessory) parts.push("Mesajların altına bir öğe ekliyor.");
    if (plugin.chatBarButton) parts.push("Sohbet kutusuna bir düğme ekliyor.");
    if (plugin.messagePopoverButton) parts.push("Mesaj üzerine gelince çıkan araç çubuğuna düğme ekliyor.");
    if (plugin.contextMenus) parts.push("Sağ tık menülerine seçenek ekliyor.");
    if (plugin.managedStyle) parts.push("Kendi CSS'ini yüklüyor.");

    const apis = (plugin.dependencies ?? []).filter(dep => dep.endsWith("API"));
    if (apis.length > 0) parts.push(`Şu MCord API'lerine dayanıyor: ${apis.join(", ")}.`);

    if (patchCount === 0) {
        parts.push(
            pluginRequiresRestart(plugin)
                ? "Bir ayarı yeniden başlatma gerektiriyor."
                : "Anında etkili; yeniden başlatma gerekmez."
        );
    }

    return parts.join(" ");
}
