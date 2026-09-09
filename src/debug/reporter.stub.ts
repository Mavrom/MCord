/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/*
 * Reporter'ın **üretim** stub'ı.
 *
 * Gerçek `reporter.ts` yalnızca `pnpm buildReporter` (CI doğrulama koşusu) için
 * gerekli: `loadLazyChunks` + 20 bin modülü require etme + tüm finder'ları
 * yeniden çalıştırma mantığını içeriyor. Normal istemcide bu kod hiç
 * çalışmıyor ama `window.Mcord.Reporter` üzerinden erişilebilir olduğu için
 * esbuild onu ağaç-sarsımıyla atamıyordu ve pakete ~15 KB ölü kod giriyordu.
 *
 * Bu dosya build sırasında (IS_REPORTER değilken) gerçek modülün yerine
 * geçiyor — hiçbir ağır bağımlılık (p-limit, tracer, loadLazyChunks) pakete
 * girmiyor.
 */

export function registerReporterPatch(): void {
    /* reporter build'i değil — no-op */
}

export function recordConsoleError(_message: string): void {
    /* rapor koşusu yok — hata toplamaya gerek yok */
}

export async function init(): Promise<void> {
    /* reporter build'i değil — no-op */
}

export function findBadWebpackFinds(): string[] {
    return [];
}

export function runClientSelfCheck(_delayMs?: number): void {
    /* açılışta donmaya yol açıyordu — sadece reporter build'inde anlamlı */
}
