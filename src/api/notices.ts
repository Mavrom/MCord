/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/*
 * Kanıtlanmış açık-kaynak istemcinin (Vencord) güncel `Notices` API'sinin
 * birebir portu.
 *
 * Kendi çubuğumuzu render etmiyoruz: Discord'un kendi notice modülünü
 * (`m.show && m.dismiss && !m.suppressAll`) kullanıyoruz. `NoticesAPI` patch'i
 * `NoticeStore`'u değiştirip bizim notice'imiz kuyruktayken Discord'unkini
 * bastırıyor.
 */

import { waitFor } from "../webpack/lazy";

let NoticesModule: any;
waitFor(
    (m: any) => m.show && m.dismiss && !m.suppressAll,
    (m: any) => { NoticesModule = m; }
);

export const noticesQueue: any[] = [];
export let currentNotice: any = null;

export function popNotice(): void {
    NoticesModule?.dismiss?.();
}

export function nextNotice(): void {
    currentNotice = noticesQueue.shift();

    if (currentNotice) {
        NoticesModule?.show?.(...currentNotice, "McordNotice");
    }
}

export function showNotice(message: any, buttonText: string, onOkClick: () => void): void {
    noticesQueue.push(["GENERIC", message, buttonText, onOkClick]);
    if (!currentNotice) nextNotice();
}
