# MCord Scanner App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kullanıcının token'ıyla kendi oturumunda Discord'u açıp MCord'un tüm patch/finder'larını gerçek koşulda deneyen, kırık ya da kaymış olanlar için "kod nereye gitti, nasıl görünüyor" teşhisini yapıp Claude'a yönelik `fix-brief.md` üreten yerel bir Electron app.

**Architecture:** MCord'un reporter build'i (`pnpm buildReporter`) Electron penceresindeki Discord'a sayfa script'lerinden önce enjekte edilir. Reporter, `window.MCordScannerSink` varsa ham veriyi (patch izleri, arama sonuçları ve şekilleri, tüm modül kaynakları) IPC ile ana sürece akıtır. Ana süreçteki saf Node motoru bu `ScanPayload`'dan durumları hesaplar, `baselines/<branch>.json`'u günceller, sorunlu kayıtları teşhis eder ve brief'i yazar. Motor Electron'dan bağımsızdır; kaydedilmiş bir `payload.json` üzerinde `node src/offlineCli.ts` ile de koşar.

**Tech Stack:** TypeScript (Node 24 native type-stripping, `.ts` import uzantıları), vitest 5, Electron 38, esbuild 0.25, mevcut scanner motoru (`BuildIndex`, `extract`, `structHash`, `moduleInfo`).

**Spec:** `docs/superpowers/specs/2026-09-30-mcord-scanner-app-design.md`

## Global Constraints

- İki ayrı çalışma alanı var, karıştırma:
  - **MCord değişiklikleri** (reporter, codePatcher, `baselines/`): worktree `C:\Users\Berk\Desktop\MCord\.claude\worktrees\vencord-invalid-user-plugin-a90642`, dal `claude/scanner-discord-module-c77e1d`. Burada `git commit` yapılır. Bitince main'e ff-merge ve push.
  - **Scanner app**: `C:\Users\Berk\Desktop\MCord\scanner` (ana checkout'un altında, MCord'un `.gitignore`'unda). Task 1'de burada **ayrı, yerel ve remote'suz** bir git reposu açılır, scanner commit'leri oraya gider. GitHub'a hiçbir zaman push edilmez.
- Commit mesajlarında Claude attribution trailer'ı YOK (kullanıcı kuralı). Mesajlar Türkçe, mevcut stil: `alan: kısa açıklama`.
- Scanner kodu: `.ts` uzantılı importlar, `erasableSyntaxOnly` (enum ve parameter property yok), `verbatimModuleSyntax` (tip importları `import type`).
- Token hiçbir dosyaya düz metin yazılmaz, hiçbir log, payload ya da brief'e girmez. Tüm metin çıktıları `mask()` (`scanner/src/util/secrets.ts`) üzerinden geçer.
- Discord hesabı salt okunur kullanılır: mesaj gönderen, sunucuya katılan ya da ayar değiştiren kod YAZILMAZ.
- MCord'da `IS_REPORTER` dışındaki davranış değişmez. Yeni kod `IS_REPORTER` koşulu arkasında ya da yalnızca `reporter.ts`'ten import edilen dosyalarda olur (üretimde `reporter.stub.ts` ile değişir).
- Plugin, dosya ya da özellik silinmez.
- Kayma eşiği `0.6`. Kesit yarıçapı `400` karakter. Toplam zaman aşımı 15 dk, sessizlik zaman aşımı 90 sn. Aday sayısı 3. Brief hedef boyutu < 500 KB.

## Dosya haritası

**MCord (worktree):**
- Modify `src/webpack/codePatcher.ts`: `IS_REPORTER` altında patch izleri (`patchTrace`).
- Modify `src/debug/loadLazyChunks.ts`: atlanan worker chunk id'lerini dışa ver (`skippedLazyChunks`).
- Create `src/debug/scannerExport.ts`: payload'ı toplayıp sink'e gönderen saf yardımcılar ve `exportToScanner()`.
- Create `src/debug/scannerExport.test.ts`
- Modify `src/debug/reporter.ts`: rapor bitince `exportToScanner(report)`.
- Create `baselines/.gitkeep`

**Scanner (`scanner/`):**
- `src/scan/payload.ts`: `ScanPayload` tipleri ve `parsePayload`.
- `src/baseline/fingerprint.ts`: parmak izi, kesit, token benzerliği.
- `src/baseline/store.ts`: baseline dosyası okuma, yazma, güncelleme.
- `src/scan/entries.ts`: payload, tanımlar ve baseline'dan `Entry[]` (durumlar) üretir.
- `src/diagnose/successor.ts`: halef modül puanlama, `literalPieces`.
- `src/diagnose/align.ts`: bölge hizalama ve `find` önerisi.
- `src/diagnose/vencord.ts`: Vencord `main` karşılığı (önbellekli, `fetch` enjekte edilebilir).
- `src/diagnose/index.ts`: `diagnose()` birleştirici.
- `src/brief/render.ts`: `fix-brief.md` üretimi.
- `src/scan/runScan.ts`: orkestrasyon (payload → baseline, teşhis, brief, dosyalar).
- `src/offlineCli.ts`: kaydedilmiş payload üzerinde motoru koşturur.
- `app/build.mjs`: esbuild ile `app-dist/`.
- `app/main.ts`: Electron giriş noktası (UI ve CLI modu).
- `app/tokenStore.ts`: `safeStorage` ile şifreli token.
- `app/discordWindow.ts`: oturum, ağ filtresi, pencere, giriş akışları.
- `app/collector.ts`: reporter derleme, enjeksiyon, sink toplama, zaman aşımları.
- `app/preload-discord.ts`: token tohumlama, sink köprüsü, renderer enjeksiyonu.
- `app/preload-ui.ts`: UI köprüsü.
- `app/ui/index.html`, `app/ui/ui.ts`: giriş ve ana ekran.
- Test: `test/payload.test.ts`, `test/fingerprint.test.ts`, `test/baseline.test.ts`, `test/entries.test.ts`, `test/successor.test.ts`, `test/align.test.ts`, `test/vencord.test.ts`, `test/brief.test.ts`, `test/runScan.test.ts`, `test/fixtures/scan.ts`.

---

### Task 1: Scanner yerel repo ve payload tipleri

**Files:**
- Create: `scanner/.gitignore`
- Create: `scanner/src/scan/payload.ts`
- Test: `scanner/test/payload.test.ts`

**Interfaces:**
- Produces: `ScanPayload`, `ScanPatch`, `ScanFind`, `ScanMeta`, `ScanReport`, `parsePayload(text: string): ScanPayload` (payload.ts). Sonraki tüm scanner task'ları bu tipleri kullanır. Aynı JSON şeklini Task 2'deki MCord `scannerExport.ts` üretir.

- [ ] **Step 1: Yerel repoyu aç**

`scanner/.gitignore`:
```
node_modules/
cache/
builds/
out/
.state/
.cache/
app-dist/
mfw-*.json
```

```bash
cd /c/Users/Berk/Desktop/MCord/scanner
git init -q -b main
git add -A
git commit -q -m "scanner: mevcut durum (yerel repo başlangıcı)"
git log --oneline -1
```
Beklenen: tek commit. `git remote -v` boş olmalı.

- [ ] **Step 2: Failing test**

`scanner/test/payload.test.ts`:
```ts
import { describe, expect, it } from "vitest";

import { parsePayload } from "../src/scan/payload.ts";

const valid = {
    format: "mcord-scan/1",
    meta: { branch: "stable", buildNumber: 1, buildHash: "abc", mcordCommit: "c0ffee", moduleCount: 1, skippedChunks: [], scannedAt: "2026-09-30T00:00:00Z", partial: false },
    patches: [{ plugin: "Demo", index: 0, find: "x", findIsRegex: false, findFlags: "", matches: [{ source: "a", flags: "", isRegex: false }], all: false, hits: ["1"], misses: [] }],
    finds: [{ kind: "findLazy", label: "byKeys(\"a\")", moduleId: "1", shape: ["a"], ok: true }],
    report: { badPatches: [], erroredPatches: [], badWebpackFinds: [] },
    modules: { "1": "function(e,t,n){x a}" }
};

describe("parsePayload", () => {
    it("geçerli payload'ı döndürür", () => {
        const p = parsePayload(JSON.stringify(valid));
        expect(p.patches[0].plugin).toBe("Demo");
        expect(Object.keys(p.modules)).toEqual(["1"]);
    });
    it("yanlış formatı reddeder", () => {
        expect(() => parsePayload(JSON.stringify({ ...valid, format: "x" }))).toThrow(/mcord-scan\/1/);
    });
    it("modülsüz payload'ı reddeder", () => {
        expect(() => parsePayload(JSON.stringify({ ...valid, modules: {} }))).toThrow(/modül/);
    });
});
```

- [ ] **Step 3: Testin düştüğünü gör**

Run: `cd /c/Users/Berk/Desktop/MCord/scanner && pnpm vitest run test/payload.test.ts`
Expected: FAIL, `Cannot find module '../src/scan/payload.ts'`.

- [ ] **Step 4: Uygula**

`scanner/src/scan/payload.ts`:
```ts
/**
 * MCord reporter'ının (scanner modunda) ürettiği ham veri. Şekli MCord
 * `src/debug/scannerExport.ts` ile birebir aynı tutulmalı.
 */

export interface ScanMatch { source: string; flags: string; isRegex: boolean }

export interface ScanPatch {
    plugin: string;
    /** Plugin içindeki kayıt sırası (0'dan). */
    index: number;
    /** Kanonik find: string ise metin, regex ise `.source`. */
    find: string;
    findIsRegex: boolean;
    findFlags: string;
    matches: ScanMatch[];
    all: boolean;
    /** `find`'ın tuttuğu modül id'leri. */
    hits: string[];
    /** Tutmayan replacement'lar. */
    misses: Array<{ moduleId: string; match: string }>;
}

export interface ScanFind {
    kind: string;
    /** `describeFilter` çıktısı ya da store adı. */
    label: string;
    moduleId: string | null;
    /** Dönen değerin ilk düzey anahtarları (sıralı, en çok 50). */
    shape: string[] | null;
    ok: boolean;
}

export interface ScanMeta {
    branch: string;
    buildNumber: number;
    buildHash: string | null;
    mcordCommit: string;
    moduleCount: number;
    skippedChunks: string[];
    scannedAt: string;
    /** Zaman aşımıyla yarım kalan tarama. */
    partial: boolean;
}

export interface ScanReport {
    badPatches: Array<{ plugin: string; find: string; reason: string }>;
    erroredPatches: Array<{ moduleId: string; plugins: string[]; error: string }>;
    badWebpackFinds: string[];
}

export interface ScanPayload {
    format: "mcord-scan/1";
    meta: ScanMeta;
    patches: ScanPatch[];
    finds: ScanFind[];
    report: ScanReport;
    modules: Record<string, string>;
}

export function parsePayload(text: string): ScanPayload {
    const p = JSON.parse(text) as ScanPayload;
    if (p?.format !== "mcord-scan/1") throw new Error("Geçersiz payload (format mcord-scan/1 değil).");
    if (p.modules == null || Object.keys(p.modules).length === 0) throw new Error("Payload'da hiç modül yok.");
    if (!Array.isArray(p.patches) || !Array.isArray(p.finds)) throw new Error("Payload'da patch/find listesi eksik.");
    return p;
}
```

- [ ] **Step 5: Test geçiyor mu**

Run: `pnpm vitest run test/payload.test.ts`
Expected: PASS (3 test).

- [ ] **Step 6: Commit (scanner reposu)**

```bash
git add .gitignore src/scan/payload.ts test/payload.test.ts
git commit -m "scan: ScanPayload tipleri ve doğrulama"
```

---

### Task 2: MCord reporter'a scanner çıktısı

**Files:**
- Modify: `src/webpack/codePatcher.ts` (addPatch ve patchFactory içinde `IS_REPORTER` izleri)
- Modify: `src/debug/loadLazyChunks.ts` (atlanan chunk'ları dışa ver)
- Create: `src/debug/scannerExport.ts`
- Test: `src/debug/scannerExport.test.ts`
- Modify: `src/debug/reporter.ts` (`init()` sonunda çağrı)
- Create: `baselines/.gitkeep`

(Tüm yollar worktree köküne göredir.)

**Interfaces:**
- Consumes: Task 1'deki JSON şekli (`mcord-scan/1`). Burada aynı tipler MCord tarafında yeniden tanımlanır, çünkü paket bağımlılığı yok.
- Produces: `window.MCordScannerSink(kind: "meta"|"patches"|"finds"|"report"|"modules"|"done"|"failed", data: unknown): void` çağrı sırası: `meta` → `patches` → `finds` → `report` → `modules` (500'lük paketler, birden fazla) → `done`. Hata olursa `failed` (mesaj string). Task 9'daki collector bu sırayı bekler.

- [ ] **Step 1: Saf yardımcılar için failing test**

`src/debug/scannerExport.test.ts`:
```ts
/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { describe, expect, it } from "vitest";

import { chunkModules, serializePat, shapeOf } from "./scannerExport";

describe("scannerExport yardımcıları", () => {
    it("serializePat string ve regex'i ayırır", () => {
        expect(serializePat("abc")).toEqual({ source: "abc", flags: "", isRegex: false });
        expect(serializePat(/a\.b/g)).toEqual({ source: "a\\.b", flags: "g", isRegex: true });
    });
    it("shapeOf ilk düzey anahtarları sıralı ve sınırlı döndürür", () => {
        expect(shapeOf({ b: 1, a: 2 })).toEqual(["a", "b"]);
        expect(shapeOf(null)).toBeNull();
        expect(shapeOf(() => 1)).toEqual(["<function>"]);
        const big = Object.fromEntries(Array.from({ length: 80 }, (_, i) => [`k${String(i).padStart(2, "0")}`, i]));
        expect(shapeOf(big)).toHaveLength(50);
    });
    it("shapeOf fırlatan getter'da patlamaz", () => {
        const o = {};
        Object.defineProperty(o, "bad", { get() { throw new Error("x"); }, enumerable: true });
        expect(shapeOf(o)).toEqual(["bad"]);
    });
    it("chunkModules 500'lük paketlere böler", () => {
        const mods = Object.fromEntries(Array.from({ length: 1201 }, (_, i) => [String(i), "s"]));
        const chunks = chunkModules(mods, 500);
        expect(chunks.map(c => Object.keys(c).length)).toEqual([500, 500, 201]);
    });
});
```

- [ ] **Step 2: Testin düştüğünü gör**

Run: `pnpm vitest run src/debug/scannerExport.test.ts`
Expected: FAIL, modül bulunamadı.

- [ ] **Step 3: codePatcher izleri**

`src/webpack/codePatcher.ts`, `patchTimings` tanımının hemen altına:
```ts
/**
 * Scanner için patch izleri (yalnızca reporter build'i). Uygulanan patch'ler
 * `patches`'ten düştüğü için "hangi modüle uydu / hangi match tutmadı" bilgisi
 * ancak burada kalıyor.
 */
export interface PatchTrace { index: number; hits: string[]; misses: Array<{ moduleId: string; match: string }> }
export const patchTrace = new Map<Patch, PatchTrace>();
const pluginPatchCounts = new Map<string, number>();
```

`addPatch` içinde `patches.push(canonicalizePatch(patch));` satırını şununla değiştir:
```ts
    const canonical = canonicalizePatch(patch);
    patches.push(canonical);

    if (IS_REPORTER) {
        const index = pluginPatchCounts.get(pluginName) ?? 0;
        pluginPatchCounts.set(pluginName, index + 1);
        patchTrace.set(canonical, { index, hits: [], misses: [] });
    }
```

`patchFactory` içinde `if (!matchesFind(patch.find, originalFactoryCode)) continue;` satırının hemen altına:
```ts
        if (IS_REPORTER) patchTrace.get(patch)?.hits.push(String(moduleId));
```

Aynı fonksiyonda `if (newCode === patchedCode) {` bloğunun ilk satırı olarak:
```ts
                if (IS_REPORTER) {
                    patchTrace.get(patch)?.misses.push({ moduleId: String(moduleId), match: String(replacement.match) });
                }
```

- [ ] **Step 4: Atlanan chunk'lar**

`src/debug/loadLazyChunks.ts`, `let chunksAlreadyLoaded = false;` satırının altına:
```ts
/** Worker olduğu için yüklenmeyen chunk id'leri — scanner kapsama bilgisi. */
export const skippedLazyChunks: string[] = [];
```
`loadLazyChunks()` içinde `logger.log(\`Tüm chunk'lar yüklendi — ...` çağrısından hemen önce:
```ts
        skippedLazyChunks.push(...[...invalidChunks].map(String));
```

- [ ] **Step 5: scannerExport.ts**

`src/debug/scannerExport.ts`:
```ts
/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/*
 * Scanner app'ine ham veri aktarımı. Yalnızca `reporter.ts`'ten import edilir;
 * üretim build'inde reporter stub'la değiştiği için pakete girmez. Sayfada
 * `window.MCordScannerSink` yoksa (CI koşusu) hiçbir şey yapmaz.
 *
 * JSON şekli scanner'daki `src/scan/payload.ts` (`mcord-scan/1`) ile aynıdır.
 */

import { getBuildNumber, patchTrace } from "../webpack/codePatcher";
import { byStoreName, describeFilter } from "../webpack/filters";
import { find, findModuleId } from "../webpack/finder";
import { lazyWebpackSearchHistory, setRecordSearchHistory, wreq } from "../webpack/intercept";
import { resolveStore } from "../webpack/stores";
import type { ModuleFilter } from "../webpack/types";
import { skippedLazyChunks } from "./loadLazyChunks";
import type { Report } from "./reporter";

type Sink = (kind: string, data: unknown) => void;

export function serializePat(pat: string | RegExp): { source: string; flags: string; isRegex: boolean } {
    return typeof pat === "string"
        ? { source: pat, flags: "", isRegex: false }
        : { source: pat.source, flags: pat.flags, isRegex: true };
}

export function shapeOf(value: unknown): string[] | null {
    if (value == null) return null;
    if (typeof value === "function" && Object.getOwnPropertyNames(value).every(k => ["length", "name", "prototype"].includes(k))) {
        return ["<function>"];
    }
    if (typeof value !== "object" && typeof value !== "function") return [`<${typeof value}>`];
    try {
        return Object.getOwnPropertyNames(value).sort().slice(0, 50);
    } catch {
        return null;
    }
}

export function chunkModules(modules: Record<string, string>, size: number): Array<Record<string, string>> {
    const out: Array<Record<string, string>> = [];
    let current: Record<string, string> = {};
    let n = 0;
    for (const [id, src] of Object.entries(modules)) {
        current[id] = src;
        if (++n === size) { out.push(current); current = {}; n = 0; }
    }
    if (n > 0) out.push(current);
    return out;
}

function collectPatches() {
    return [...patchTrace.entries()].map(([patch, trace]) => {
        const replacements = Array.isArray(patch.replacement) ? patch.replacement : [patch.replacement];
        const find = serializePat(patch.find);
        return {
            plugin: patch.plugin,
            index: trace.index,
            find: find.source,
            findIsRegex: find.isRegex,
            findFlags: find.flags,
            matches: replacements.map(r => serializePat(r.match)),
            all: patch.all === true,
            hits: trace.hits,
            misses: trace.misses
        };
    });
}

function collectFinds() {
    const history = [...lazyWebpackSearchHistory];
    const out: Array<{ kind: string; label: string; moduleId: string | null; shape: string[] | null; ok: boolean }> = [];
    setRecordSearchHistory(false);
    try {
        for (const [kind, args] of history) {
            try {
                if (kind === "waitForStore" || kind === "findStoreLazy") {
                    const name = String(args[0]);
                    const store = resolveStore(name) ?? find(byStoreName(name), { silent: true });
                    const id = findModuleId(byStoreName(name), { silent: true });
                    out.push({ kind, label: `store: ${name}`, moduleId: id == null ? null : String(id), shape: shapeOf(store), ok: store != null });
                    continue;
                }
                const filter = args[0] as ModuleFilter;
                if (typeof filter !== "function") continue;
                const value = find(filter, { silent: true });
                const id = findModuleId(filter, { silent: true });
                out.push({ kind, label: describeFilter(filter), moduleId: id == null ? null : String(id), shape: shapeOf(value), ok: value != null });
            } catch (err) {
                out.push({ kind, label: `${kind}: doğrulama hata verdi — ${String(err)}`, moduleId: null, shape: null, ok: false });
            }
        }
    } finally {
        setRecordSearchHistory(true);
    }
    return out;
}

function collectModules(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const id in wreq.m) {
        // `String()` şart: fabrikalar Proxy; `Function.prototype.toString.call(proxy)`
        // "[native code]" döner, proxy'nin `toString` tuzağı ise orijinal kaynağı verir.
        try { out[id] = String(wreq.m[id]); } catch { /* okunamayanı atla */ }
    }
    return out;
}

/** Rapor koşusu bittiğinde çağrılır. Sink yoksa no-op. */
export async function exportToScanner(report: Report): Promise<void> {
    const sink = (window as any).MCordScannerSink as Sink | undefined;
    if (typeof sink !== "function") return;

    try {
        const modules = collectModules();
        sink("meta", {
            branch: String((window as any).GLOBAL_ENV?.RELEASE_CHANNEL ?? "stable"),
            buildNumber: getBuildNumber(),
            buildHash: report.meta.buildHash,
            mcordCommit: report.meta.commitHash,
            moduleCount: Object.keys(modules).length,
            skippedChunks: skippedLazyChunks,
            scannedAt: new Date().toISOString(),
            partial: false
        });
        sink("patches", collectPatches());
        await new Promise(r => setTimeout(r, 0));
        sink("finds", collectFinds());
        sink("report", {
            badPatches: report.badPatches,
            erroredPatches: report.erroredPatches,
            badWebpackFinds: report.badWebpackFinds
        });
        for (const part of chunkModules(modules, 500)) {
            sink("modules", part);
            await new Promise(r => setTimeout(r, 0));
        }
        sink("done", null);
    } catch (err) {
        sink("failed", String(err));
    }
}
```

- [ ] **Step 6: reporter.ts'e bağla**

`src/debug/reporter.ts` başındaki importlara ekle:
```ts
import { exportToScanner } from "./scannerExport";
```
`init()` içinde `logSummary(report);` satırından hemen sonra:
```ts
        await exportToScanner(report);
```
`catch (err)` bloğunun sonuna (`console.log("[REPORTER_FAILED]", ...)` satırından sonra):
```ts
        (window as any).MCordScannerSink?.("failed", String(err));
```

- [ ] **Step 7: Testler, lint, tip kontrolü, iki build**

```bash
pnpm vitest run src/debug/scannerExport.test.ts
pnpm test
pnpm lint
pnpm typecheck
pnpm buildReporter
grep -c "MCordScannerSink" dist/renderer.js
pnpm build
grep -c "MCordScannerSink" dist/renderer.js
```
Beklenen: testler PASS. Lint temiz. Reporter build'inde sayı ≥ 1, üretim build'inde `0` (grep exit 1). Üretimde sayı 0 değilse: stub yer değiştirmesi scannerExport'u dışarıda bırakmıyor demektir. `scripts/build.mjs`'de reporter stub eşlemesine bak ve scannerExport'un yalnızca `reporter.ts`'ten import edildiğini doğrula.

`pnpm lint` komutu package.json'da yoksa `pnpm eslint src/debug src/webpack/codePatcher.ts` kullan.

- [ ] **Step 8: baselines klasörü ve commit**

```bash
mkdir -p baselines && touch baselines/.gitkeep
git add src/webpack/codePatcher.ts src/debug/loadLazyChunks.ts src/debug/scannerExport.ts src/debug/scannerExport.test.ts src/debug/reporter.ts baselines/.gitkeep
git commit -m "reporter: scanner app için patch izi, arama şekli ve modül aktarımı"
```

---

### Task 3: Parmak izi, kesit, benzerlik

**Files:**
- Create: `scanner/src/baseline/fingerprint.ts`
- Test: `scanner/test/fingerprint.test.ts`

**Interfaces:**
- Consumes: `analyzeStatic` (`src/analyze/moduleInfo.ts`), `isUsefulString` (`src/analyze/records.ts`), `structuralHash` (`src/analyze/structHash.ts`).
- Produces:
  - `interface Fingerprint { strings: string[]; exports: string[]; structHash: string }`
  - `fingerprint(source: string): Fingerprint`: en fazla 40 kullanışlı string.
  - `excerpt(source: string, index: number, length?: number, radius?: number): { text: string; offset: number }`, `radius` varsayılanı `RADIUS = 400`.
  - `tokens(text: string): Set<string>`: 4+ karakterli tanımlayıcılar ve tırnaklı string'ler.
  - `similarity(a: string, b: string): number`: token Jaccard, 0..1.
  - `locate(source: string, pat: { source: string; flags: string; isRegex: boolean }): number`: eşleşme indeksi, yoksa -1.
  - `export const RADIUS = 400; export const DRIFT_THRESHOLD = 0.6;`

- [ ] **Step 1: Failing test**

`scanner/test/fingerprint.test.ts`:
```ts
import { describe, expect, it } from "vitest";

import { DRIFT_THRESHOLD, excerpt, fingerprint, locate, similarity, tokens } from "../src/baseline/fingerprint.ts";

const SRC = `function(e,t,n){n.d(t,{Store:()=>a});var a="MaskedLinkStore",b="isTrustedDomain";function c(x){return x.trusted}}`;

describe("fingerprint", () => {
    it("string, export ve structHash çıkarır", () => {
        const fp = fingerprint(SRC);
        expect(fp.strings).toContain("MaskedLinkStore");
        expect(fp.exports).toEqual(["Store"]);
        expect(fp.structHash).toMatch(/^[0-9a-f]{16}$/);
    });
});

describe("excerpt", () => {
    it("eşleşme etrafını keser ve başlangıcı döndürür", () => {
        const long = "x".repeat(1000) + "HIT" + "y".repeat(1000);
        const e = excerpt(long, 1000, 3, 10);
        expect(e.text).toBe("x".repeat(10) + "HIT" + "y".repeat(10));
        expect(e.offset).toBe(990);
    });
    it("kaynak sınırlarında taşmaz", () => {
        expect(excerpt("abcHIT", 3, 3, 10)).toEqual({ text: "abcHIT", offset: 0 });
    });
});

describe("similarity", () => {
    it("aynı metin 1, ilgisiz metin ~0", () => {
        expect(similarity(SRC, SRC)).toBe(1);
        expect(similarity(SRC, "completely other words here")).toBeLessThan(0.1);
    });
    it("değişken adları değişince yüksek kalır", () => {
        const renamed = SRC.replaceAll("x.trusted", "q.trusted");
        expect(similarity(SRC, renamed)).toBeGreaterThan(DRIFT_THRESHOLD);
    });
    it("tokens kısa tanımlayıcıları atar", () => {
        expect([...tokens("a bb ccc dddd \"eeee\"")]).toEqual(["dddd", "\"eeee\""]);
    });
});

describe("locate", () => {
    it("string ve regex desenini bulur", () => {
        expect(locate(SRC, { source: "MaskedLinkStore", flags: "", isRegex: false })).toBe(SRC.indexOf("MaskedLinkStore"));
        expect(locate(SRC, { source: "return \\w+\\.trusted", flags: "", isRegex: true })).toBe(SRC.indexOf("return x.trusted"));
        expect(locate(SRC, { source: "yok", flags: "", isRegex: false })).toBe(-1);
    });
});
```

- [ ] **Step 2: Düştüğünü gör**

Run: `pnpm vitest run test/fingerprint.test.ts`
Expected: FAIL, modül yok.

- [ ] **Step 3: Uygula**

`scanner/src/baseline/fingerprint.ts`:
```ts
import { analyzeStatic } from "../analyze/moduleInfo.ts";
import { isUsefulString } from "../analyze/records.ts";
import { structuralHash } from "../analyze/structHash.ts";

export const RADIUS = 400;
export const DRIFT_THRESHOLD = 0.6;
const MAX_STRINGS = 40;

export interface Fingerprint { strings: string[]; exports: string[]; structHash: string }

export function fingerprint(source: string): Fingerprint {
    const info = analyzeStatic(source);
    return {
        strings: info.strings.filter(isUsefulString).slice(0, MAX_STRINGS),
        exports: info.exportNames,
        structHash: structuralHash(source)
    };
}

export function excerpt(source: string, index: number, length = 0, radius = RADIUS): { text: string; offset: number } {
    const offset = Math.max(0, index - radius);
    const end = Math.min(source.length, index + length + radius);
    return { text: source.slice(offset, end), offset };
}

const TOKEN = /"(?:[^"\\\n]|\\.){2,80}"|'(?:[^'\\\n]|\\.){2,80}'|[A-Za-z_$][\w$]{3,}/g;

export function tokens(text: string): Set<string> {
    return new Set(text.match(TOKEN) ?? []);
}

export function similarity(a: string, b: string): number {
    const ta = tokens(a);
    const tb = tokens(b);
    if (ta.size === 0 && tb.size === 0) return 1;
    let inter = 0;
    for (const t of ta) if (tb.has(t)) inter++;
    return inter / (ta.size + tb.size - inter);
}

export function locate(source: string, pat: { source: string; flags: string; isRegex: boolean }): number {
    if (!pat.isRegex) return source.indexOf(pat.source);
    try {
        const m = new RegExp(pat.source, pat.flags.replace(/[gy]/g, "")).exec(source);
        return m ? m.index : -1;
    } catch {
        return -1;
    }
}
```

- [ ] **Step 4: Test geçiyor mu**

Run: `pnpm vitest run test/fingerprint.test.ts`
Expected: PASS. `tokens` testi sırayı kontrol ediyor. `Set` ekleme sırası kaynak sırası olduğu için geçer.

- [ ] **Step 5: Commit**

```bash
git add src/baseline/fingerprint.ts test/fingerprint.test.ts
git commit -m "baseline: parmak izi, kesit ve token benzerliği"
```

---

### Task 4: Baseline deposu

**Files:**
- Create: `scanner/src/baseline/store.ts`
- Test: `scanner/test/baseline.test.ts`

**Interfaces:**
- Consumes: `Fingerprint` (Task 3).
- Produces:
  - `interface BaselineEntry { kind: "patch" | "finder"; plugin: string | null; label: string; buildHash: string | null; moduleId: string; excerpt: string; fingerprint: Fingerprint; shape: string[] | null; updatedAt: string }`
  - `interface BaselineFile { version: 1; branch: string; entries: Record<string, BaselineEntry> }`
  - `patchKey(plugin: string, find: string): string` → `patch::<plugin>::<find>`
  - `finderKey(label: string): string` → `finder::<label>`
  - `baselinePath(mcordRoot: string, branch: string): string` → `<mcordRoot>/baselines/<branch>.json`
  - `loadBaseline(path: string, branch: string): BaselineFile`: dosya yoksa boş.
  - `saveBaseline(path: string, file: BaselineFile): void`: anahtarlar sıralı, 1 boşluk girinti, sonda `\n`, atomik yazım.
  - `applyUpdates(file: BaselineFile, updates: Record<string, BaselineEntry>): BaselineFile`: yalnızca verilen anahtarları ekler ya da ezer, diğerlerine dokunmaz.

- [ ] **Step 1: Failing test**

`scanner/test/baseline.test.ts`:
```ts
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { applyUpdates, type BaselineEntry, baselinePath, finderKey, loadBaseline, patchKey, saveBaseline } from "../src/baseline/store.ts";

const entry = (label: string): BaselineEntry => ({
    kind: "patch", plugin: "Demo", label, buildHash: "b1", moduleId: "1", excerpt: "ctx",
    fingerprint: { strings: ["s"], exports: [], structHash: "0".repeat(16) }, shape: null, updatedAt: "2026-09-30T00:00:00Z"
});

describe("baseline store", () => {
    it("anahtarlar", () => {
        expect(patchKey("Demo", "x")).toBe("patch::Demo::x");
        expect(finderKey("byKeys(\"a\")")).toBe("finder::byKeys(\"a\")");
        expect(baselinePath("/r", "stable").replaceAll("\\", "/")).toBe("/r/baselines/stable.json");
    });
    it("dosya yoksa boş döner, kaydedip geri okur", () => {
        const dir = mkdtempSync(join(tmpdir(), "bl-"));
        const path = join(dir, "baselines", "stable.json");
        const empty = loadBaseline(path, "stable");
        expect(empty).toEqual({ version: 1, branch: "stable", entries: {} });
        const next = applyUpdates(empty, { [patchKey("Demo", "b")]: entry("b"), [patchKey("Demo", "a")]: entry("a") });
        saveBaseline(path, next);
        const text = readFileSync(path, "utf8");
        expect(text.indexOf("patch::Demo::a")).toBeLessThan(text.indexOf("patch::Demo::b"));
        expect(text.endsWith("\n")).toBe(true);
        expect(loadBaseline(path, "stable")).toEqual(next);
    });
    it("applyUpdates yalnızca verilen anahtarlara dokunur", () => {
        const base = applyUpdates({ version: 1, branch: "s", entries: {} }, { k1: entry("1"), k2: entry("2") });
        const next = applyUpdates(base, { k2: { ...entry("2"), excerpt: "yeni" } });
        expect(next.entries.k1.excerpt).toBe("ctx");
        expect(next.entries.k2.excerpt).toBe("yeni");
        expect(base.entries.k2.excerpt).toBe("ctx");
    });
});
```

- [ ] **Step 2: Düştüğünü gör**

Run: `pnpm vitest run test/baseline.test.ts`. Expected: FAIL.

- [ ] **Step 3: Uygula**

`scanner/src/baseline/store.ts`:
```ts
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import type { Fingerprint } from "./fingerprint.ts";

/**
 * "Bu kod sağlamken nasıl görünüyordu" hafızası. MCord reposunda
 * `baselines/<branch>.json` olarak commit'lenir; token/kişisel veri içermez,
 * yalnızca Discord'un kendi paket kaynağından kısa kesitler.
 */

export interface BaselineEntry {
    kind: "patch" | "finder";
    plugin: string | null;
    label: string;
    buildHash: string | null;
    moduleId: string;
    excerpt: string;
    fingerprint: Fingerprint;
    shape: string[] | null;
    updatedAt: string;
}

export interface BaselineFile { version: 1; branch: string; entries: Record<string, BaselineEntry> }

export const patchKey = (plugin: string, find: string) => `patch::${plugin}::${find}`;
export const finderKey = (label: string) => `finder::${label}`;
export const baselinePath = (mcordRoot: string, branch: string) => join(mcordRoot, "baselines", `${branch}.json`);

export function loadBaseline(path: string, branch: string): BaselineFile {
    if (!existsSync(path)) return { version: 1, branch, entries: {} };
    const file = JSON.parse(readFileSync(path, "utf8")) as BaselineFile;
    if (file.version !== 1) throw new Error(`Bilinmeyen baseline sürümü: ${path}`);
    return file;
}

export function saveBaseline(path: string, file: BaselineFile): void {
    const sorted: BaselineFile = {
        version: 1,
        branch: file.branch,
        entries: Object.fromEntries(Object.keys(file.entries).sort().map(k => [k, file.entries[k]]))
    };
    mkdirSync(dirname(path), { recursive: true });
    const tmp = `${path}.tmp`;
    writeFileSync(tmp, JSON.stringify(sorted, null, 1) + "\n");
    renameSync(tmp, path);
}

export function applyUpdates(file: BaselineFile, updates: Record<string, BaselineEntry>): BaselineFile {
    return { ...file, entries: { ...file.entries, ...updates } };
}
```

- [ ] **Step 4: Test geçiyor mu**

Run: `pnpm vitest run test/baseline.test.ts`. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/baseline/store.ts test/baseline.test.ts
git commit -m "baseline: dosya deposu"
```

---

### Task 5: Kayıtlar ve durumlar (entries)

**Files:**
- Create: `scanner/src/scan/entries.ts`
- Create: `scanner/test/fixtures/scan.ts`
- Test: `scanner/test/entries.test.ts`

**Interfaces:**
- Consumes: `ScanPayload`, `ScanPatch`, `ScanFind` (Task 1). `BaselineFile`, `BaselineEntry`, `patchKey`, `finderKey` (Task 4). `fingerprint`, `excerpt`, `locate`, `similarity`, `DRIFT_THRESHOLD` (Task 3). `Extracted`, `PatchDef`, `FinderDef` (`src/finders/extract.ts`). `compilePat` (`src/finders/canonicalize.ts`). `describeSpec` (`src/finders/evaluate.ts`).
- Produces:
  - `type Status = "sağlam" | "kaymış" | "kırık-find" | "kırık-match" | "çoklu" | "hata" | "şekil-değişti"`
  - `interface Location { file: string; line: number }`
  - `interface Entry { key: string; kind: "patch" | "finder"; plugin: string | null; label: string; status: Status; detail: string; locations: Location[]; moduleId: string | null; current: { text: string; offset: number } | null; baseline: BaselineEntry | null; patch?: ScanPatch; find?: ScanFind }`
  - `buildEntries(payload: ScanPayload, defs: Extracted, baseline: BaselineFile): Entry[]`
  - `baselineUpdates(entries: Entry[], payload: ScanPayload): Record<string, BaselineEntry>`: yalnızca `sağlam` ve `kaymış` kayıtlar (kod hâlâ tutuyor), modülü olanlar.
  - `const SEVERITY: Status[]`: sıra `hata`, `kırık-find`, `kırık-match`, `şekil-değişti`, `çoklu`, `kaymış`, `sağlam`.
- Fixture `test/fixtures/scan.ts` şunları dışa verir: `makePayload(overrides?)`, `DEFS` (Extracted), `OLD_MODULE`, `NEW_MODULE`. Task 6, 8 ve 10'daki testler bunları kullanır.

- [ ] **Step 1: Fixture**

`scanner/test/fixtures/scan.ts`:
```ts
import type { Extracted } from "../../src/finders/extract.ts";
import type { ScanPayload } from "../../src/scan/payload.ts";

/** Eski build'de sağlam olan modül: `isTrusted` kontrolü. */
export const OLD_MODULE = `function(e,t,n){n.d(t,{Z:()=>s});var a="MaskedLinkStore",r="trustedDomains";function s(e){if(isTrusted(e)){return checkDomain(e,"bitbucket.org")}return false}}`;
/** Yeni build: store adı ve fonksiyon adı değişmiş, geri kalan bağlam aynı. */
export const NEW_MODULE = `function(e,t,n){n.d(t,{Z:()=>s});var a="MaskedLinkStoreV2",r="trustedDomains";function s(e){if(isTrustedLink(e)){return checkDomain(e,"bitbucket.org")}return false}}`;
export const OTHER_MODULE = `function(e,t,n){var q="somethingElse";return q}`;

export const DEFS: Extracted = {
    filesScanned: 2,
    patches: [
        { kind: "patch", plugin: "AlwaysTrust", file: "src/plugins/alwaysTrust/index.ts", line: 34, find: '="MaskedLinkStore",', replacements: [{ match: { regex: "isTrusted\\(\\i\\)", flags: "" } }], all: false, group: false, unresolved: [] },
        { kind: "patch", plugin: "Other", file: "src/plugins/other/index.ts", line: 10, find: "somethingElse", replacements: [{ match: "somethingElse" }], all: false, group: false, unresolved: [] }
    ],
    finders: [
        { kind: "finder", plugin: "Other", file: "src/plugins/other/index.ts", line: 20, fn: "findByPropsLazy", spec: { type: "byKeys", args: ["open", "close"] } }
    ]
};

export function makePayload(overrides: Partial<ScanPayload> = {}): ScanPayload {
    return {
        format: "mcord-scan/1",
        meta: { branch: "stable", buildNumber: 2, buildHash: "new", mcordCommit: "c0ffee", moduleCount: 2, skippedChunks: [], scannedAt: "2026-09-30T00:00:00Z", partial: false },
        patches: [
            { plugin: "AlwaysTrust", index: 0, find: '="MaskedLinkStore",', findIsRegex: false, findFlags: "", matches: [{ source: "isTrusted\\((?:[A-Za-z_$][\\w$]*)\\)", flags: "", isRegex: true }], all: false, hits: [], misses: [] },
            { plugin: "Other", index: 0, find: "somethingElse", findIsRegex: false, findFlags: "", matches: [{ source: "somethingElse", flags: "", isRegex: false }], all: false, hits: ["30"], misses: [] }
        ],
        finds: [
            { kind: "findByPropsLazy", label: "byKeys(\"open\", \"close\")", moduleId: "30", shape: ["close", "open"], ok: true }
        ],
        report: { badPatches: [], erroredPatches: [], badWebpackFinds: [] },
        modules: { "20": NEW_MODULE, "30": OTHER_MODULE },
        ...overrides
    };
}
```

- [ ] **Step 2: Failing test**

`scanner/test/entries.test.ts`:
```ts
import { describe, expect, it } from "vitest";

import { fingerprint } from "../src/baseline/fingerprint.ts";
import { type BaselineFile, finderKey, patchKey } from "../src/baseline/store.ts";
import { baselineUpdates, buildEntries } from "../src/scan/entries.ts";
import { DEFS, makePayload, OLD_MODULE, OTHER_MODULE } from "./fixtures/scan.ts";

const EMPTY: BaselineFile = { version: 1, branch: "stable", entries: {} };

describe("buildEntries", () => {
    it("tutmayan find → kırık-find, konum eşlenir", () => {
        const e = buildEntries(makePayload(), DEFS, EMPTY).find(x => x.plugin === "AlwaysTrust")!;
        expect(e.status).toBe("kırık-find");
        expect(e.locations).toEqual([{ file: "src/plugins/alwaysTrust/index.ts", line: 34 }]);
        expect(e.key).toBe(patchKey("AlwaysTrust", '="MaskedLinkStore",'));
    });
    it("tutan patch → sağlam, güncel kesit dolu", () => {
        const e = buildEntries(makePayload(), DEFS, EMPTY).find(x => x.plugin === "Other" && x.kind === "patch")!;
        expect(e.status).toBe("sağlam");
        expect(e.moduleId).toBe("30");
        expect(e.current?.text).toContain("somethingElse");
    });
    it("replacement tutmadı → kırık-match", () => {
        const p = makePayload();
        p.patches[1].misses = [{ moduleId: "30", match: "somethingElse" }];
        expect(buildEntries(p, DEFS, EMPTY).find(x => x.plugin === "Other" && x.kind === "patch")!.status).toBe("kırık-match");
    });
    it("çalışma anı hatası → hata", () => {
        const p = makePayload({ report: { badPatches: [], erroredPatches: [{ moduleId: "30", plugins: ["Other"], error: "boom" }], badWebpackFinds: [] } });
        const e = buildEntries(p, DEFS, EMPTY).find(x => x.plugin === "Other" && x.kind === "patch")!;
        expect(e.status).toBe("hata");
        expect(e.detail).toContain("boom");
    });
    it("all:false find birden çok modülde → çoklu", () => {
        const p = makePayload();
        p.modules["31"] = OTHER_MODULE;
        expect(buildEntries(p, DEFS, EMPTY).find(x => x.plugin === "Other" && x.kind === "patch")!.status).toBe("çoklu");
    });
    it("baseline'dan çok uzaklaşmış → kaymış", () => {
        const baseline: BaselineFile = { version: 1, branch: "stable", entries: {
            [patchKey("Other", "somethingElse")]: { kind: "patch", plugin: "Other", label: "somethingElse", buildHash: "old", moduleId: "9", excerpt: "tamamen farklı eski bağlam kelimeleri burada duruyor", fingerprint: fingerprint(OLD_MODULE), shape: null, updatedAt: "x" }
        } };
        expect(buildEntries(makePayload(), DEFS, baseline).find(x => x.plugin === "Other" && x.kind === "patch")!.status).toBe("kaymış");
    });
    it("finder: bulunamadı → kırık-find, şekil eksildi → şekil-değişti", () => {
        const p1 = makePayload();
        p1.finds[0] = { ...p1.finds[0], ok: false, moduleId: null, shape: null };
        const f1 = buildEntries(p1, DEFS, EMPTY).find(x => x.kind === "finder")!;
        expect(f1.status).toBe("kırık-find");
        expect(f1.locations).toEqual([{ file: "src/plugins/other/index.ts", line: 20 }]);

        const baseline: BaselineFile = { version: 1, branch: "stable", entries: {
            [finderKey("byKeys(\"open\", \"close\")")]: { kind: "finder", plugin: null, label: "byKeys(\"open\", \"close\")", buildHash: "old", moduleId: "30", excerpt: OTHER_MODULE, fingerprint: fingerprint(OTHER_MODULE), shape: ["close", "open", "toggle"], updatedAt: "x" }
        } };
        const f2 = buildEntries(makePayload(), DEFS, baseline).find(x => x.kind === "finder")!;
        expect(f2.status).toBe("şekil-değişti");
        expect(f2.detail).toContain("toggle");
    });
});

describe("baselineUpdates", () => {
    it("yalnızca kodu hâlâ tutan kayıtlar güncellenir", () => {
        const p = makePayload();
        const updates = baselineUpdates(buildEntries(p, DEFS, EMPTY), p);
        expect(Object.keys(updates).sort()).toEqual([finderKey("byKeys(\"open\", \"close\")"), patchKey("Other", "somethingElse")].sort());
        expect(updates[patchKey("Other", "somethingElse")].buildHash).toBe("new");
    });
});
```

- [ ] **Step 3: Düştüğünü gör**

Run: `pnpm vitest run test/entries.test.ts`. Expected: FAIL.

- [ ] **Step 4: Uygula**

`scanner/src/scan/entries.ts`:
```ts
import { DRIFT_THRESHOLD, excerpt, fingerprint, locate, similarity } from "../baseline/fingerprint.ts";
import { type BaselineEntry, type BaselineFile, finderKey, patchKey } from "../baseline/store.ts";
import { compilePat } from "../finders/canonicalize.ts";
import { describeSpec } from "../finders/evaluate.ts";
import type { Extracted, FinderDef, PatchDef } from "../finders/extract.ts";
import type { ScanFind, ScanPatch, ScanPayload } from "./payload.ts";

export type Status = "sağlam" | "kaymış" | "kırık-find" | "kırık-match" | "çoklu" | "hata" | "şekil-değişti";
export const SEVERITY: Status[] = ["hata", "kırık-find", "kırık-match", "şekil-değişti", "çoklu", "kaymış", "sağlam"];

export interface Location { file: string; line: number }

export interface Entry {
    key: string;
    kind: "patch" | "finder";
    plugin: string | null;
    label: string;
    status: Status;
    detail: string;
    locations: Location[];
    moduleId: string | null;
    current: { text: string; offset: number } | null;
    baseline: BaselineEntry | null;
    patch?: ScanPatch;
    find?: ScanFind;
}

const norm = (s: string) => s.replace(/\s+/g, "");

/** Çalışma anındaki (kanonik) patch'i kaynaktaki tanımına eşler: önce find eşitliği, sonra sıra. */
function locatePatch(p: ScanPatch, defs: PatchDef[]): Location[] {
    const own = defs.filter(d => d.plugin === p.plugin);
    const byFind = own.filter(d => {
        if (d.find == null) return false;
        const c = compilePat(d.find);
        return p.findIsRegex ? c.regex?.source === p.find : c.text === p.find;
    });
    const hit = byFind.length > 0 ? byFind : own[p.index] ? [own[p.index]] : [];
    return hit.map(d => ({ file: d.file, line: d.line }));
}

function locateFinder(label: string, defs: FinderDef[]): Location[] {
    const want = norm(label.replace(/^store: /, ""));
    return defs
        .filter(d => {
            const described = norm(describeSpec(d.spec));
            return described === want || described === norm(`byStoreName("${label.replace(/^store: /, "")}")`);
        })
        .map(d => ({ file: d.file, line: d.line }));
}

function patchEntry(p: ScanPatch, payload: ScanPayload, defs: Extracted, baseline: BaselineFile): Entry {
    const key = patchKey(p.plugin, p.find);
    const base = baseline.entries[key] ?? null;
    const findPat = { source: p.find, flags: p.findFlags, isRegex: p.findIsRegex };
    const moduleId = p.hits[0] ?? null;
    const source = moduleId ? payload.modules[moduleId] : undefined;
    const at = source ? locate(source, findPat) : -1;
    const current = source && at >= 0 ? excerpt(source, at, p.findIsRegex ? 0 : p.find.length) : null;

    const common = { key, kind: "patch" as const, plugin: p.plugin, label: p.find, locations: locatePatch(p, defs.patches), moduleId, current, baseline: base, patch: p };

    const errored = payload.report.erroredPatches.find(e => e.plugins.includes(p.plugin) && p.hits.includes(e.moduleId));
    if (errored) return { ...common, status: "hata", detail: `patch'lenmiş modül ${errored.moduleId} çalışırken patlıyor: ${errored.error}` };
    if (p.hits.length === 0) return { ...common, status: "kırık-find", detail: "find hiçbir modülle eşleşmedi" };
    if (p.misses.length > 0) return { ...common, status: "kırık-match", detail: `find tuttu ama ${p.misses.length} replacement eşleşmedi: ${p.misses.map(m => m.match).join(" | ")}` };

    if (!p.all) {
        const count = Object.values(payload.modules).filter(src => locate(src, findPat) >= 0).length;
        if (count > 1) return { ...common, status: "çoklu", detail: `find ${count} modülde geçiyor; ilk bulunana uygulandı` };
    }
    if (base && current) {
        const score = similarity(base.excerpt, current.text);
        if (score < DRIFT_THRESHOLD) return { ...common, status: "kaymış", detail: `baseline'a benzerlik ${score.toFixed(2)} (< ${DRIFT_THRESHOLD})` };
    }
    return { ...common, status: "sağlam", detail: `${p.hits.length} modül` };
}

function finderEntry(f: ScanFind, payload: ScanPayload, defs: Extracted, baseline: BaselineFile): Entry {
    const key = finderKey(f.label);
    const base = baseline.entries[key] ?? null;
    const source = f.moduleId ? payload.modules[f.moduleId] : undefined;
    const current = source ? { text: source.slice(0, 800), offset: 0 } : null;
    const common = { key, kind: "finder" as const, plugin: null, label: f.label, locations: locateFinder(f.label, defs.finders), moduleId: f.moduleId, current, baseline: base, find: f };

    if (!f.ok) return { ...common, status: "kırık-find", detail: "arama hiçbir şey döndürmedi" };
    if (base?.shape && f.shape) {
        const missing = base.shape.filter(k => !f.shape!.includes(k));
        if (missing.length) return { ...common, status: "şekil-değişti", detail: `dönen değerde artık yok: ${missing.join(", ")}` };
    }
    if (base && source && base.fingerprint.structHash !== fingerprint(source).structHash && similarity(base.excerpt, current!.text) < DRIFT_THRESHOLD) {
        return { ...common, status: "kaymış", detail: "modül yapısı baseline'dan belirgin biçimde değişti" };
    }
    return { ...common, status: "sağlam", detail: "bulundu" };
}

export function buildEntries(payload: ScanPayload, defs: Extracted, baseline: BaselineFile): Entry[] {
    const entries = [
        ...payload.patches.map(p => patchEntry(p, payload, defs, baseline)),
        ...payload.finds.map(f => finderEntry(f, payload, defs, baseline))
    ];
    // Aynı arama birden çok kez kaydedilmiş olabilir: anahtar başına tek kayıt.
    const seen = new Set<string>();
    return entries.filter(e => (seen.has(e.key) ? false : (seen.add(e.key), true)));
}

export function baselineUpdates(entries: Entry[], payload: ScanPayload): Record<string, BaselineEntry> {
    const out: Record<string, BaselineEntry> = {};
    for (const e of entries) {
        if ((e.status !== "sağlam" && e.status !== "kaymış") || !e.moduleId || !e.current) continue;
        const source = payload.modules[e.moduleId];
        if (!source) continue;
        out[e.key] = {
            kind: e.kind,
            plugin: e.plugin,
            label: e.label,
            buildHash: payload.meta.buildHash,
            moduleId: e.moduleId,
            excerpt: e.current.text,
            fingerprint: fingerprint(source),
            shape: e.find?.shape ?? null,
            updatedAt: payload.meta.scannedAt
        };
    }
    return out;
}
```

- [ ] **Step 5: Test geçiyor mu**

Run: `pnpm vitest run test/entries.test.ts`
Expected: PASS. "kaymış" testi düşerse: fixture baseline kesitinin güncel kesitle ortak token'ı neredeyse olmadığı için benzerlik < 0.6 olmalı. `similarity` çıktısını yazdırıp kontrol et. Eşiği DEĞİŞTİRME.

- [ ] **Step 6: Commit**

```bash
git add src/scan/entries.ts test/entries.test.ts test/fixtures/scan.ts
git commit -m "scan: payload + tanım + baseline'dan durum kayıtları"
```

---

### Task 6: Halef modül ve bölge hizalama

**Files:**
- Create: `scanner/src/diagnose/successor.ts`
- Create: `scanner/src/diagnose/align.ts`
- Test: `scanner/test/successor.test.ts`, `scanner/test/align.test.ts`

**Interfaces:**
- Consumes: `Fingerprint`, `fingerprint`, `excerpt`, `tokens`, `RADIUS` (Task 3). `OLD_MODULE`, `NEW_MODULE`, `OTHER_MODULE` (Task 5 fixture).
- Produces:
  - `literalPieces(pattern: string, isRegex: boolean): string[]`: 4+ karakterli sabit parçalar.
  - `interface Candidate { id: string; score: number }`
  - `findSuccessors(query: { strings: string[]; exports?: string[]; structHash?: string }, modules: Record<string, string>, limit?: number): Candidate[]`: skor ≥ 0.2, azalan sıra, varsayılan limit 3.
  - `queryFromBaseline(fp: Fingerprint, excerptText: string): { strings: string[]; exports: string[]; structHash: string }`: parmak izi string'leriyle kesitin tırnaklı string'lerinin birleşimi.
  - `alignRegion(anchorText: string, source: string): { text: string; offset: number; score: number } | null`
  - `suggestFind(moduleSource: string, window: { offset: number; length: number }, modules: Record<string, string>): string | null` (uygulamada revize edildi: IDF puanlama, regex tarayıcı, tırnak-güvenli aday; aşağıdaki kod ilk taslaktır, geçerli hâli scanner repo `3809994`)
  - `looksLikeIntlHash(s: string): boolean`

- [ ] **Step 1: Failing testler**

`scanner/test/successor.test.ts`:
```ts
import { describe, expect, it } from "vitest";

import { fingerprint } from "../src/baseline/fingerprint.ts";
import { findSuccessors, literalPieces, queryFromBaseline } from "../src/diagnose/successor.ts";
import { NEW_MODULE, OLD_MODULE, OTHER_MODULE } from "./fixtures/scan.ts";

describe("literalPieces", () => {
    it("string find'ı olduğu gibi, regex'ten sabit parçaları alır", () => {
        expect(literalPieces('="MaskedLinkStore",', false)).toEqual(['="MaskedLinkStore",']);
        expect(literalPieces("isTrusted\\((?:[A-Za-z_$][\\w$]*)\\)\\{return", true)).toEqual(["isTrusted", "{return"]);
    });
});

describe("findSuccessors", () => {
    const modules = { "20": NEW_MODULE, "30": OTHER_MODULE };
    it("baseline parmak iziyle yeni modülü ilk sıraya koyar", () => {
        const q = queryFromBaseline(fingerprint(OLD_MODULE), OLD_MODULE);
        const c = findSuccessors(q, modules);
        expect(c[0].id).toBe("20");
        expect(c[0].score).toBeGreaterThan(0.4);
        expect(c.find(x => x.id === "30")).toBeUndefined();
    });
    it("hiç ortaklık yoksa boş döner", () => {
        expect(findSuccessors({ strings: ["zzzzzzzz"] }, modules)).toEqual([]);
    });
});
```

`scanner/test/align.test.ts`:
```ts
import { describe, expect, it } from "vitest";

import { alignRegion, looksLikeIntlHash, suggestFind } from "../src/diagnose/align.ts";
import { NEW_MODULE, OLD_MODULE, OTHER_MODULE } from "./fixtures/scan.ts";

describe("alignRegion", () => {
    it("eski kesitin çapalarını yeni modülde bulur", () => {
        const r = alignRegion(OLD_MODULE, NEW_MODULE)!;
        expect(r.text).toContain("checkDomain");
        expect(r.score).toBeGreaterThan(0.5);
    });
    it("çapa yoksa null", () => {
        expect(alignRegion(OLD_MODULE, OTHER_MODULE)).toBeNull();
    });
});

describe("suggestFind", () => {
    it("tek modülde geçen en kısa tırnaklı string'i önerir", () => {
        const modules = { "20": NEW_MODULE, "30": OTHER_MODULE, "31": `x="trustedDomains"` };
        expect(suggestFind(NEW_MODULE, modules)).toBe('"bitbucket.org"');
    });
    it("benzersiz aday yoksa null", () => {
        expect(suggestFind(`"ab"`, { "1": `"ab"`, "2": `"ab"` })).toBeNull();
    });
});

describe("looksLikeIntlHash", () => {
    it("6 karakterli base64 benzeri özellik erişimini tanır", () => {
        expect(looksLikeIntlHash(".aB3+/x")).toBe(false);
        expect(looksLikeIntlHash(".aB3dEf")).toBe(true);
        expect(looksLikeIntlHash('["1aB+cD"]')).toBe(true);
        expect(looksLikeIntlHash('"bitbucket.org"')).toBe(false);
    });
});
```

- [ ] **Step 2: Düştüğünü gör**

Run: `pnpm vitest run test/successor.test.ts test/align.test.ts`. Expected: FAIL.

- [ ] **Step 3: successor.ts**

`scanner/src/diagnose/successor.ts`:
```ts
import type { Fingerprint } from "../baseline/fingerprint.ts";

export interface Candidate { id: string; score: number }

/** Regex/string desenden modül aramasında kullanılabilecek sabit parçalar. */
export function literalPieces(pattern: string, isRegex: boolean): string[] {
    if (!isRegex) return pattern.length >= 4 ? [pattern] : [];
    const cleaned = pattern
        .replace(/\(\?:\[A-Za-z_\$\]\[\\w\$\]\*\)/g, "\u0000") // kanonik \i
        .replace(/\\i/g, "\u0000")
        .replace(/\\([^\w])/g, "$1")                         // \( → (
        .replace(/\\[dwsbDWSB]|\.\+\??|\.\*\??|\[[^\]]*\]|\(\?<?[=!:]/g, "\u0000");
    return cleaned
        .split(/[\u0000()|*+?^$]/)
        .map(s => s.trim())
        .filter(s => s.length >= 4);
}

const QUOTED = /"(?:[^"\\\n]|\\.){4,80}"/g;

export function queryFromBaseline(fp: Fingerprint, excerptText: string) {
    const quoted = (excerptText.match(QUOTED) ?? []).map(s => s.slice(1, -1));
    return { strings: [...new Set([...fp.strings, ...quoted])], exports: fp.exports, structHash: fp.structHash };
}

export function findSuccessors(
    query: { strings: string[]; exports?: string[]; structHash?: string },
    modules: Record<string, string>,
    limit = 3
): Candidate[] {
    if (query.strings.length === 0) return [];
    const out: Candidate[] = [];
    for (const [id, source] of Object.entries(modules)) {
        let hit = 0;
        for (const s of query.strings) if (source.includes(s)) hit++;
        if (hit === 0) continue;
        let score = 0.8 * (hit / query.strings.length);
        if (query.exports?.length) {
            const found = query.exports.filter(e => new RegExp(String.raw`[{,]${e.replace(/\$/g, "\\$")}:\(\)=>`).test(source)).length;
            score += 0.2 * (found / query.exports.length);
        } else {
            score += 0.2 * (hit / query.strings.length);
        }
        if (score >= 0.2) out.push({ id, score: Number(score.toFixed(3)) });
    }
    return out.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, limit);
}
```

- [ ] **Step 4: align.ts**

`scanner/src/diagnose/align.ts`:
```ts
import { excerpt, RADIUS, tokens } from "../baseline/fingerprint.ts";

/** Her modülde geçen JS sözcükleri çapa olamaz. */
const STOP = new Set(["function", "return", "typeof", "arguments", "undefined", "Object", "prototype", "default", "exports", "constructor", "length", "Promise", "Symbol", "Array", "String", "Number", "Error", "Boolean"]);

/** Eski kesitteki token'ları yeni kaynakta arar, en yoğun pencereyi seçer. */
export function alignRegion(anchorText: string, source: string): { text: string; offset: number; score: number } | null {
    const anchors = [...tokens(anchorText)].filter(t => t.length >= 6 && !STOP.has(t));
    if (anchors.length === 0) return null;

    const hits: number[] = [];
    let found = 0;
    for (const a of anchors) {
        const at = source.indexOf(a);
        if (at >= 0) { found++; hits.push(at); }
    }
    if (found === 0 || found / anchors.length < 0.2) return null;

    let bestCenter = hits[0];
    let bestCount = 0;
    for (const h of hits) {
        const count = hits.filter(x => Math.abs(x - h) <= RADIUS).length;
        if (count > bestCount) { bestCount = count; bestCenter = h; }
    }
    const e = excerpt(source, bestCenter);
    return { ...e, score: Number((found / anchors.length).toFixed(3)) };
}

const QUOTED = /"(?:[^"\\\n]|\\.){4,80}"/g;

/** Bölgedeki, tüm build'de yalnızca tek modülde geçen en kısa tırnaklı string. */
export function suggestFind(region: string, modules: Record<string, string>): string | null {
    const candidates = [...new Set(region.match(QUOTED) ?? [])].sort((a, b) => a.length - b.length || a.localeCompare(b));
    const sources = Object.values(modules);
    for (const c of candidates) {
        let count = 0;
        for (const s of sources) {
            if (s.includes(c) && ++count > 1) break;
        }
        if (count === 1) return c;
    }
    return null;
}

/** Discord intl hash'i: 6 karakterlik base64 benzeri anahtar. */
export function looksLikeIntlHash(s: string): boolean {
    return /^\.[A-Za-z0-9]{6}$/.test(s) || /^\["[A-Za-z0-9+/]{6}"\]$/.test(s);
}
```

- [ ] **Step 5: Testler geçiyor mu**

Run: `pnpm vitest run test/successor.test.ts test/align.test.ts`
Expected: PASS.

`suggestFind` testi: `NEW_MODULE`'deki tırnaklı adaylar kısadan uzuna `"bitbucket.org"` (15), `"trustedDomains"` (16), `"MaskedLinkStoreV2"`. `"bitbucket.org"` yalnızca 20'de geçer ve ilk döner.

`literalPieces` testi düşerse gerçek çıktıyı yazdır. Beklenen `["isTrusted", "{return"]`. Kanonik `\i` ve `\(`, `\)` kaçışları ayrıştırıcıda sırasıyla işleniyor: `\)` → `)` → split. Testteki beklentiyi değil, ayrıştırıcıyı düzelt.

- [ ] **Step 6: Commit**

```bash
git add src/diagnose/successor.ts src/diagnose/align.ts test/successor.test.ts test/align.test.ts
git commit -m "diagnose: halef modül puanlama, bölge hizalama, find önerisi"
```

---

### Task 7: Vencord karşılığı

**Files:**
- Create: `scanner/src/diagnose/vencord.ts`
- Test: `scanner/test/vencord.test.ts`

**Interfaces:**
- Consumes: `extractFromText` (`src/finders/extract.ts`), `compilePat` (`src/finders/canonicalize.ts`).
- Produces:
  - `type Fetch = (url: string) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>`
  - `interface VencordPatch { find: string; matches: string[]; line: number }`
  - `interface VencordInfo { url: string; patches: VencordPatch[] }`
  - `createVencordLookup(opts: { cacheDir: string; fetch: Fetch; today?: string }): (file: string) => Promise<VencordInfo | null>`
  - Davranış: `file` (MCord'a göre göreli, örn. `src/plugins/alwaysTrust/index.ts`) için sırayla `.../Vencord/main/<file>`, sonra `.ts`↔`.tsx` değişmiş hâli denenir. 404 → sonraki aday, hepsi başarısız → `null`. Ağ hatası → `null` (fırlatmaz). Sonuç `cacheDir/<today>/<file ile / yerine __>.json` dosyasına yazılır ve aynı gün tekrar ağa çıkılmaz. `null` sonuçlar da önbelleğe alınır.

- [ ] **Step 1: Failing test**

`scanner/test/vencord.test.ts`:
```ts
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { createVencordLookup } from "../src/diagnose/vencord.ts";

const PLUGIN = `
import definePlugin from "@utils/types";
export default definePlugin({
    name: "AlwaysTrust",
    patches: [{ find: '="MaskedLinkStore",', replacement: { match: /(?<=isTrusted\\(\\i\\)\\{)return \\i\\(\\i\\)/, replace: "return true" } }]
});`;

function fakeFetch(map: Record<string, string>) {
    return vi.fn(async (url: string) => {
        const body = map[url];
        return { ok: body != null, status: body != null ? 200 : 404, text: async () => body ?? "" };
    });
}

const BASE = "https://raw.githubusercontent.com/Vendicated/Vencord/main/";

describe("vencord lookup", () => {
    it("aynı yoldaki dosyadan patch'leri çıkarır ve önbelleğe alır", async () => {
        const fetch = fakeFetch({ [`${BASE}src/plugins/alwaysTrust/index.ts`]: PLUGIN });
        const lookup = createVencordLookup({ cacheDir: mkdtempSync(join(tmpdir(), "vc-")), fetch, today: "2026-09-30" });
        const info = await lookup("src/plugins/alwaysTrust/index.ts");
        expect(info?.patches[0].find).toBe('"=\\"MaskedLinkStore\\","');
        expect(info?.patches[0].matches[0]).toContain("isTrusted");
        await lookup("src/plugins/alwaysTrust/index.ts");
        expect(fetch).toHaveBeenCalledTimes(1);
    });
    it(".ts yoksa .tsx dener", async () => {
        const fetch = fakeFetch({ [`${BASE}src/plugins/x/index.tsx`]: PLUGIN });
        const lookup = createVencordLookup({ cacheDir: mkdtempSync(join(tmpdir(), "vc-")), fetch, today: "d" });
        expect((await lookup("src/plugins/x/index.ts"))?.url).toBe(`${BASE}src/plugins/x/index.tsx`);
    });
    it("bulunamazsa ya da ağ hatasında null", async () => {
        const lookup = createVencordLookup({ cacheDir: mkdtempSync(join(tmpdir(), "vc-")), fetch: fakeFetch({}), today: "d" });
        expect(await lookup("src/plugins/yok/index.ts")).toBeNull();
        const broken = createVencordLookup({ cacheDir: mkdtempSync(join(tmpdir(), "vc-")), fetch: async () => { throw new Error("offline"); }, today: "d" });
        expect(await broken("src/plugins/a/index.ts")).toBeNull();
    });
});
```

- [ ] **Step 2: Düştüğünü gör**

Run: `pnpm vitest run test/vencord.test.ts`. Expected: FAIL.

- [ ] **Step 3: Uygula**

`scanner/src/diagnose/vencord.ts`:
```ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { compilePat } from "../finders/canonicalize.ts";
import { extractFromText } from "../finders/extract.ts";

export type Fetch = (url: string) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;
export interface VencordPatch { find: string; matches: string[]; line: number }
export interface VencordInfo { url: string; patches: VencordPatch[] }

const BASE = "https://raw.githubusercontent.com/Vendicated/Vencord/main/";

function candidates(file: string): string[] {
    const swapped = file.endsWith(".tsx") ? file.slice(0, -1) : file.endsWith(".ts") ? `${file}x` : file;
    return [file, swapped].filter((v, i, a) => a.indexOf(v) === i);
}

export function createVencordLookup(opts: { cacheDir: string; fetch: Fetch; today?: string }) {
    const day = opts.today ?? new Date().toISOString().slice(0, 10);
    const dir = join(opts.cacheDir, day);

    return async (file: string): Promise<VencordInfo | null> => {
        const cachePath = join(dir, `${file.replaceAll("/", "__")}.json`);
        if (existsSync(cachePath)) return JSON.parse(readFileSync(cachePath, "utf8")) as VencordInfo | null;

        let result: VencordInfo | null = null;
        try {
            for (const rel of candidates(file)) {
                const url = BASE + rel;
                const res = await opts.fetch(url);
                if (!res.ok) continue;
                const defs = extractFromText(await res.text(), rel);
                result = {
                    url,
                    patches: defs.patches.map(p => ({
                        find: p.find == null ? "(çözümlenemedi)" : compilePat(p.find).label,
                        matches: p.replacements.map(r => (r.match == null ? "(çözümlenemedi)" : compilePat(r.match).label)),
                        line: p.line
                    }))
                };
                break;
            }
        } catch {
            return null; // ağ yok: önbelleğe yazma, bir dahaki sefere dene
        }
        mkdirSync(dir, { recursive: true });
        writeFileSync(cachePath, JSON.stringify(result));
        return result;
    };
}
```

- [ ] **Step 4: Test geçiyor mu**

Run: `pnpm vitest run test/vencord.test.ts`
Expected: PASS. `compilePat(string).label` değeri `JSON.stringify(find)` olduğu için ilk testteki beklenen değer kaçışlı hâldir.

- [ ] **Step 5: Commit**

```bash
git add src/diagnose/vencord.ts test/vencord.test.ts
git commit -m "diagnose: Vencord main karşılığı (günlük önbellek)"
```

---

### Task 8: Teşhis birleştirici ve brief

**Files:**
- Create: `scanner/src/diagnose/index.ts`
- Create: `scanner/src/brief/render.ts`
- Test: `scanner/test/brief.test.ts`

**Interfaces:**
- Consumes: `Entry`, `SEVERITY` (Task 5). `findSuccessors`, `queryFromBaseline`, `literalPieces`, `Candidate` (Task 6). `alignRegion`, `suggestFind`, `looksLikeIntlHash` (Task 6). `VencordInfo` (Task 7). `ScanPayload` (Task 1). `mask` (`src/util/secrets.ts`).
- Produces:
  - `interface Diagnosis { candidates: Array<Candidate & { excerpt: string }>; region: { text: string; offset: number; moduleId: string } | null; suggestedFind: string | null; suggestedIsIntl: boolean; vencord: VencordInfo | null; confidence: "yüksek" | "orta" | "düşük"; reason: string; maybeCoverage: boolean }`
  - `diagnose(entry: Entry, payload: ScanPayload, vencord: (file: string) => Promise<VencordInfo | null>): Promise<Diagnosis>`
  - `interface BriefInput { payload: ScanPayload; entries: Entry[]; diagnoses: Map<string, Diagnosis>; mcordRoot: string; readSource: (file: string) => string | null }`
  - `renderBrief(input: BriefInput): string`: `mask()`'ten geçmiş markdown.

- [ ] **Step 1: Failing test**

`scanner/test/brief.test.ts`:
```ts
import { describe, expect, it } from "vitest";

import { fingerprint } from "../src/baseline/fingerprint.ts";
import { type BaselineFile, patchKey } from "../src/baseline/store.ts";
import { renderBrief } from "../src/brief/render.ts";
import { diagnose } from "../src/diagnose/index.ts";
import { buildEntries } from "../src/scan/entries.ts";
import { registerSecret } from "../src/util/secrets.ts";
import { DEFS, makePayload, OLD_MODULE } from "./fixtures/scan.ts";

const BASELINE: BaselineFile = { version: 1, branch: "stable", entries: {
    [patchKey("AlwaysTrust", '="MaskedLinkStore",')]: { kind: "patch", plugin: "AlwaysTrust", label: '="MaskedLinkStore",', buildHash: "old", moduleId: "7", excerpt: OLD_MODULE, fingerprint: fingerprint(OLD_MODULE), shape: null, updatedAt: "x" }
} };

const noVencord = async () => null;
const vencord = async () => ({ url: "https://raw.githubusercontent.com/Vendicated/Vencord/main/src/plugins/alwaysTrust/index.ts", patches: [{ find: '"=\\"MaskedLinkStoreV2\\","', matches: ["/isTrustedLink/"], line: 30 }] });

describe("diagnose", () => {
    it("baseline'lı kırık patch için halef, bölge ve öneri üretir", async () => {
        const payload = makePayload();
        const entry = buildEntries(payload, DEFS, BASELINE).find(e => e.plugin === "AlwaysTrust")!;
        const d = await diagnose(entry, payload, noVencord);
        expect(d.candidates[0].id).toBe("20");
        expect(d.region?.moduleId).toBe("20");
        expect(d.suggestedFind).not.toBeNull();
        expect(d.confidence).toBe("yüksek");
    });
    it("baseline yoksa find parçalarıyla arar, bulamazsa düşük güven", async () => {
        const payload = makePayload({ modules: { "30": "function(){}" } });
        const entry = buildEntries(payload, DEFS, { version: 1, branch: "stable", entries: {} }).find(e => e.plugin === "AlwaysTrust")!;
        const d = await diagnose(entry, payload, noVencord);
        expect(d.candidates).toEqual([]);
        expect(d.confidence).toBe("düşük");
        expect(d.reason).toMatch(/kaldırılmış olabilir/);
    });
});

describe("renderBrief", () => {
    it("kurallar, konum, kesitler, Vencord ve JSON bloğu içerir; token sızdırmaz", async () => {
        const token = "<SAHTE_TEST_TOKENI>";
        registerSecret(token);
        const payload = makePayload();
        payload.patches[0].misses = [];
        payload.modules["99"] = `var leak="${token}"`;
        const entries = buildEntries(payload, DEFS, BASELINE);
        const diagnoses = new Map();
        for (const e of entries.filter(x => x.status !== "sağlam")) diagnoses.set(e.key, await diagnose(e, payload, vencord));
        const md = renderBrief({ payload, entries, diagnoses, mcordRoot: "/r", readSource: () => "export default definePlugin({\n  patches: [{ find: '=\"MaskedLinkStore\",' }]\n});" });

        expect(md).toContain("# MCord fix brief");
        expect(md).toContain("## Uygulama kuralları");
        expect(md).toContain("#{intl::KEY}");
        expect(md).toContain("src/plugins/alwaysTrust/index.ts:34");
        expect(md).toContain("### Eski kesit");
        expect(md).toContain("### Yeni kesit");
        expect(md).toContain("MaskedLinkStoreV2");
        expect(md).toContain("```json");
        expect(md).not.toContain(token);
        expect(md.length).toBeLessThan(500_000);
    });
    it("sorun yoksa bunu açıkça söyler", () => {
        const payload = makePayload();
        const md = renderBrief({ payload, entries: [], diagnoses: new Map(), mcordRoot: "/r", readSource: () => null });
        expect(md).toContain("Sorun yok");
    });
});
```

- [ ] **Step 2: Düştüğünü gör**

Run: `pnpm vitest run test/brief.test.ts`. Expected: FAIL.

- [ ] **Step 3: diagnose/index.ts**

`scanner/src/diagnose/index.ts`:
```ts
import { excerpt } from "../baseline/fingerprint.ts";
import type { Entry } from "../scan/entries.ts";
import type { ScanPayload } from "../scan/payload.ts";
import { alignRegion, looksLikeIntlHash, suggestFind } from "./align.ts";
import { type Candidate, findSuccessors, literalPieces, queryFromBaseline } from "./successor.ts";
import type { VencordInfo } from "./vencord.ts";

export interface Diagnosis {
    candidates: Array<Candidate & { excerpt: string }>;
    region: { text: string; offset: number; moduleId: string } | null;
    suggestedFind: string | null;
    suggestedIsIntl: boolean;
    vencord: VencordInfo | null;
    confidence: "yüksek" | "orta" | "düşük";
    reason: string;
    maybeCoverage: boolean;
}

export async function diagnose(
    entry: Entry,
    payload: ScanPayload,
    vencord: (file: string) => Promise<VencordInfo | null>
): Promise<Diagnosis> {
    const query = entry.baseline
        ? queryFromBaseline(entry.baseline.fingerprint, entry.baseline.excerpt)
        : { strings: entry.patch ? literalPieces(entry.patch.find, entry.patch.findIsRegex) : literalPieces(entry.label, false) };

    // Kod hâlâ tutuyorsa (kaymış / kırık-match / hata / çoklu) halef = mevcut modül.
    const pinned = entry.moduleId && payload.modules[entry.moduleId] ? [{ id: entry.moduleId, score: 1 }] : [];
    const found = pinned.length ? pinned : findSuccessors(query, payload.modules);
    const candidates = found.map(c => {
        const src = payload.modules[c.id];
        const aligned = entry.baseline ? alignRegion(entry.baseline.excerpt, src) : null;
        return { ...c, excerpt: (aligned ?? excerpt(src, 0, 0, 200)).text };
    });

    let region: Diagnosis["region"] = null;
    if (candidates.length) {
        const id = candidates[0].id;
        const aligned = entry.baseline ? alignRegion(entry.baseline.excerpt, payload.modules[id]) : null;
        const text = aligned ?? (entry.current && entry.moduleId === id ? entry.current : excerpt(payload.modules[id], 0));
        region = { text: text.text, offset: text.offset, moduleId: id };
    }

    const suggestedFind = region && entry.status === "kırık-find"
        ? suggestFind(payload.modules[region.moduleId], { offset: region.offset, length: region.text.length }, payload.modules)
        : null;
    const file = entry.locations[0]?.file;
    const vc = file ? await vencord(file) : null;

    const top = candidates[0]?.score ?? 0;
    let confidence: Diagnosis["confidence"] = "düşük";
    let reason: string;
    if (!candidates.length) {
        reason = "Halef modül bulunamadı: kod Discord'dan kaldırılmış olabilir ya da taranmayan bir chunk'ta.";
    } else if (pinned.length) {
        confidence = "yüksek";
        reason = "find hâlâ bu modülde tutuyor; sorun match/replace ya da çalışma anında.";
    } else if (top >= 0.6 && region) {
        confidence = "yüksek";
        reason = `baseline parmak izi ${(top * 100).toFixed(0)}% örtüşüyor.`;
    } else if (top >= 0.35) {
        confidence = "orta";
        reason = `en iyi aday ${(top * 100).toFixed(0)}% örtüşüyor; doğrula.`;
    } else {
        reason = `zayıf aday (${(top * 100).toFixed(0)}%).`;
    }

    return {
        candidates, region, suggestedFind,
        suggestedIsIntl: suggestedFind != null && looksLikeIntlHash(suggestedFind),
        vencord: vc, confidence, reason,
        maybeCoverage: !candidates.length && payload.meta.skippedChunks.length > 0
    };
}
```

- [ ] **Step 4: brief/render.ts**

`scanner/src/brief/render.ts`:
```ts
import type { Diagnosis } from "../diagnose/index.ts";
import { type Entry, SEVERITY } from "../scan/entries.ts";
import type { ScanPayload } from "../scan/payload.ts";
import { mask } from "../util/secrets.ts";

export interface BriefInput {
    payload: ScanPayload;
    entries: Entry[];
    diagnoses: Map<string, Diagnosis>;
    mcordRoot: string;
    readSource: (file: string) => string | null;
}

const MAX_EXCERPT = 900;
const clip = (s: string) => (s.length > MAX_EXCERPT ? `${s.slice(0, MAX_EXCERPT)}…` : s);
const fence = (lang: string, body: string) => `\`\`\`${lang}\n${body.replaceAll("```", "`\u200b``")}\n\`\`\``;

const RULES = [
    "Bu dosya MCord Scanner'ın ürettiği düzeltme talimatıdır. Kullanıcıdan ek açıklama bekleme; aşağıdaki sorunları düzelt.",
    "- `find`/`match`'te Discord intl anahtarı gerekiyorsa ham string ya da hash YAZMA, `#{intl::KEY}` kullan (hash'i gösterilen öneriler \"`#{intl::KEY}`'e çevir\" diye işaretli).",
    "- Önce \"Vencord karşılığı\" bölümüne bak; Vencord zaten düzeltmişse onu uyarlayarak kullan.",
    "- Geniş `.+?` / `.*` içeren match yazma; `find` modülü daraltsa bile yanlış yere uyup crash loop yapabilir.",
    "- Plugin, dosya ya da özellik SİLME. Düzeltilemeyenleri kullanıcıya raporla.",
    "- \"Eski kesit\" patch'in sağlamken tuttuğu kod, \"Yeni kesit\" güncel build'deki karşılığıdır. Farkı bul, find/match'i yeniye uyarla.",
    "- \"(tahmini)\" işaretli konumlar sıraya göre tahmin edildi; dosyada doğru patch'i find'ına bakarak bul.",
    "- `kaymış` kayıtlar hâlâ çalışıyor: kesitleri karşılaştır; davranış doğruysa kodu değiştirme, doğrulamayı `--accept-drift` ile koş (baseline yeni hâle geçer).",
    "- Bitince doğrula: `cd scanner && pnpm scan --branch <dal>` → bu sorunlar listede olmamalı. Sonra commit."
];

function header(p: ScanPayload, entries: Entry[]): string[] {
    const count = (s: string) => entries.filter(e => e.status === s).length;
    const lines = [
        "# MCord fix brief",
        "",
        `- Dal: **${p.meta.branch}** · build ${p.meta.buildNumber} (\`${p.meta.buildHash ?? "?"}\`)`,
        `- MCord commit: \`${p.meta.mcordCommit}\` · tarama: ${p.meta.scannedAt}`,
        `- Modül: ${p.meta.moduleCount}${p.meta.partial ? " · ⚠️ **EKSİK TARAMA** (zaman aşımı; sonuçlar kısmi)" : ""}`,
        p.meta.skippedChunks.length ? `- Atlanan (worker) chunk: ${p.meta.skippedChunks.length}` : "- Atlanan chunk: yok",
        "",
        "| Durum | Sayı |", "|---|---:|",
        ...SEVERITY.map(s => `| ${s} | ${count(s)} |`),
        "",
        "## Uygulama kuralları", "", ...RULES, ""
    ];
    return lines;
}

function definitionSnippet(entry: Entry, readSource: BriefInput["readSource"]): string | null {
    const loc = entry.locations[0];
    if (!loc) return null;
    const text = readSource(loc.file);
    if (text == null) return null;
    const lines = text.split("\n");
    const from = Math.max(0, loc.line - 1);
    return lines.slice(from, from + 14).join("\n");
}

function issue(n: number, e: Entry, d: Diagnosis | undefined, readSource: BriefInput["readSource"]): string[] {
    const out = [
        `## ${n}. [${e.status}] ${e.plugin ?? "(arama)"} — \`${e.label.slice(0, 120)}\``,
        "",
        `- Konum: ${e.locations.length ? e.locations.map(l => `\`${l.file}:${l.line}\`${l.guess ? " (tahmini)" : ""}`).join(", ") : "bulunamadı (çekirdek/dinamik tanım)"}`,
        `- Ayrıntı: ${e.detail}`
    ];
    if (e.patch) {
        out.push(`- Mevcut find: \`${e.patch.find}\`${e.patch.findIsRegex ? ` (regex, bayrak \`${e.patch.findFlags}\`)` : ""}`);
        out.push(`- Mevcut match'ler: ${e.patch.matches.map(m => `\`${m.isRegex ? `/${m.source}/${m.flags}` : m.source}\``).join(", ")}`);
    }
    if (d) {
        out.push(`- Güven: **${d.confidence}** — ${d.reason}${d.maybeCoverage ? " (kapsama dışı olabilir: atlanan chunk var)" : ""}`);
        if (d.suggestedFind) {
            out.push(`- Önerilen find: \`${d.suggestedFind}\`${d.suggestedIsIntl ? " — intl hash'i gibi görünüyor, `#{intl::KEY}`'e çevir" : ""}`);
        }
        if (d.candidates.length) out.push(`- Adaylar: ${d.candidates.map(c => `\`${c.id}\` (${c.score})`).join(", ")}`);
    }
    const def = definitionSnippet(e, readSource);
    if (def) out.push("", "### MCord'daki tanım", "", fence("ts", def));
    if (e.baseline) out.push("", `### Eski kesit (build \`${e.baseline.buildHash ?? "?"}\`, modül ${e.baseline.moduleId})`, "", fence("js", clip(e.baseline.excerpt)));
    if (d?.region) out.push("", `### Yeni kesit (modül ${d.region.moduleId})`, "", fence("js", clip(d.region.text)));
    else if (e.current) out.push("", `### Yeni kesit (modül ${e.moduleId})`, "", fence("js", clip(e.current.text)));
    if (d?.vencord) {
        out.push("", `### Vencord karşılığı ([kaynak](${d.vencord.url}))`, "");
        for (const p of d.vencord.patches) out.push(`- satır ${p.line}: find \`${p.find}\` → match ${p.matches.map(m => `\`${m}\``).join(", ")}`);
    }
    out.push("");
    return out;
}

export function renderBrief(input: BriefInput): string {
    const { payload, entries, diagnoses, readSource } = input;
    const problems = entries
        .filter(e => e.status !== "sağlam")
        .sort((a, b) => SEVERITY.indexOf(a.status) - SEVERITY.indexOf(b.status) || (a.plugin ?? "").localeCompare(b.plugin ?? ""));

    const lines = header(payload, entries);
    if (problems.length === 0) {
        lines.push("## Sorun yok", "", "Tüm patch ve aramalar sağlam; baseline güncellendi.", "");
    } else {
        const fixable = problems.filter(e => diagnoses.get(e.key)?.confidence !== "düşük");
        const unfixable = problems.filter(e => diagnoses.get(e.key)?.confidence === "düşük");
        lines.push(`# Sorunlar (${fixable.length})`, "");
        fixable.forEach((e, i) => lines.push(...issue(i + 1, e, diagnoses.get(e.key), readSource)));
        if (unfixable.length) {
            lines.push(`# Düzeltilemeyenler / karar kullanıcıda (${unfixable.length})`, "",
                "Halef modül bulunamadı ya da çok zayıf. Silme; kullanıcıya bu listeyi özetle.", "");
            unfixable.forEach((e, i) => lines.push(...issue(i + 1, e, diagnoses.get(e.key), readSource)));
        }
    }

    const machine = problems.map(e => {
        const d = diagnoses.get(e.key);
        return { key: e.key, status: e.status, plugin: e.plugin, locations: e.locations, moduleId: e.moduleId, suggestedFind: d?.suggestedFind ?? null, candidates: d?.candidates.map(c => ({ id: c.id, score: c.score })) ?? [], confidence: d?.confidence ?? null };
    });
    lines.push("## Makine okunur özet", "", fence("json", JSON.stringify({ meta: payload.meta, problems: machine }, null, 1)), "");
    return mask(lines.join("\n"));
}
```

- [ ] **Step 5: Testler**

Run: `pnpm vitest run test/brief.test.ts`
Expected: PASS.

Token testi: `payload.modules["99"]` brief'e girmiyor (sorunsuz modül). Asıl koruma son satırdaki `mask()`. Testin anlamlı olması için token'ın brief'e girebildiği bir yol lazım. Bu yüzden testte `readSource`'un döndürdüğü metne token ekleyen ikinci bir `expect` ekle:
```ts
        const md2 = renderBrief({ payload, entries, diagnoses, mcordRoot: "/r", readSource: () => `const t = "${token}";` });
        expect(md2).not.toContain(token);
        expect(md2).toContain("«token»");
```

- [ ] **Step 6: Commit**

```bash
git add src/diagnose/index.ts src/brief/render.ts test/brief.test.ts
git commit -m "brief: teşhis birleştirici ve fix-brief.md üretimi"
```

---

### Task 9: Orkestrasyon ve çevrimdışı CLI

**Files:**
- Create: `scanner/src/scan/runScan.ts`
- Create: `scanner/src/offlineCli.ts`
- Test: `scanner/test/runScan.test.ts`
- Modify: `scanner/package.json` (script: `"offline": "node src/offlineCli.ts"`)

**Interfaces:**
- Consumes: Task 1–8'in tümü. `extractDefinitions` (`src/finders/extract.ts`).
- Produces:
  - `interface RunScanOptions { mcordRoot: string; outRoot: string; vencordCacheDir: string; fetch?: Fetch; defs?: Extracted; today?: string }`
  - `interface RunScanResult { outDir: string; briefPath: string; entries: Entry[]; problems: number; baselineUpdated: number }`
  - `runScan(payload: ScanPayload, opts: RunScanOptions): Promise<RunScanResult>`
  - Yan etkiler:
    - `outRoot/<branch>-<buildNumber>-<YYYYMMDDHHmmss>/fix-brief.md` ve `payload.json` yazılır. Payload yalnızca Discord kaynağıdır; yine de `mask()`'ten geçer.
    - `baselines/<branch>.json` güncellenir. `payload.meta.partial` ise baseline YAZILMAZ.
  - MCord tanım dizinleri: `["src/plugins", "src/webpack", "src/api", "src/debug", "src/components"]`. Var olmayan dizin atlanır.

- [ ] **Step 1: Failing test**

`scanner/test/runScan.test.ts`:
```ts
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { baselinePath, loadBaseline, patchKey } from "../src/baseline/store.ts";
import { runScan } from "../src/scan/runScan.ts";
import { DEFS, makePayload } from "./fixtures/scan.ts";

const offline = async () => ({ ok: false, status: 404, text: async () => "" });

describe("runScan", () => {
    it("brief + payload yazar, sağlamları baseline'a ekler", async () => {
        const root = mkdtempSync(join(tmpdir(), "rs-"));
        const res = await runScan(makePayload(), { mcordRoot: root, outRoot: join(root, "out"), vencordCacheDir: join(root, "vc"), fetch: offline, defs: DEFS, today: "d" });
        expect(existsSync(res.briefPath)).toBe(true);
        expect(existsSync(join(res.outDir, "payload.json"))).toBe(true);
        expect(readFileSync(res.briefPath, "utf8")).toContain("AlwaysTrust");
        expect(res.problems).toBe(1);
        const bl = loadBaseline(baselinePath(root, "stable"), "stable");
        expect(bl.entries[patchKey("Other", "somethingElse")]).toBeDefined();
        expect(bl.entries[patchKey("AlwaysTrust", '="MaskedLinkStore",')]).toBeUndefined();
    });
    it("eksik taramada baseline'a dokunmaz", async () => {
        const root = mkdtempSync(join(tmpdir(), "rs-"));
        const p = makePayload();
        p.meta.partial = true;
        await runScan(p, { mcordRoot: root, outRoot: join(root, "out"), vencordCacheDir: join(root, "vc"), fetch: offline, defs: DEFS, today: "d" });
        expect(existsSync(baselinePath(root, "stable"))).toBe(false);
    });
});
```

- [ ] **Step 2: Düştüğünü gör**

Run: `pnpm vitest run test/runScan.test.ts`. Expected: FAIL.

- [ ] **Step 3: runScan.ts**

`scanner/src/scan/runScan.ts`:
```ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { applyUpdates, baselinePath, loadBaseline, saveBaseline } from "../baseline/store.ts";
import { renderBrief } from "../brief/render.ts";
import { type Diagnosis, diagnose } from "../diagnose/index.ts";
import { createVencordLookup, type Fetch } from "../diagnose/vencord.ts";
import { type Extracted, extractDefinitions } from "../finders/extract.ts";
import { logger } from "../util/logger.ts";
import { mask } from "../util/secrets.ts";
import { baselineUpdates, buildEntries, type Entry } from "./entries.ts";
import type { ScanPayload } from "./payload.ts";

export interface RunScanOptions { mcordRoot: string; outRoot: string; vencordCacheDir: string; fetch?: Fetch; defs?: Extracted; today?: string; acceptDrift?: boolean }
export interface RunScanResult { outDir: string; briefPath: string; entries: Entry[]; problems: number; baselineUpdated: number }

const DEF_DIRS = ["src/plugins", "src/webpack", "src/api", "src/debug", "src/components"];

export async function runScan(payload: ScanPayload, opts: RunScanOptions): Promise<RunScanResult> {
    const defs = opts.defs ?? extractDefinitions(opts.mcordRoot, DEF_DIRS.filter(d => existsSync(join(opts.mcordRoot, d))));
    const blPath = baselinePath(opts.mcordRoot, payload.meta.branch);
    const baseline = loadBaseline(blPath, payload.meta.branch);

    const entries = buildEntries(payload, defs, baseline);
    const problems = entries.filter(e => e.status !== "sağlam");
    logger.info(`Kayıt: ${entries.length}, sorunlu: ${problems.length}`);

    const vencord = createVencordLookup({ cacheDir: opts.vencordCacheDir, fetch: opts.fetch ?? (globalThis.fetch as unknown as Fetch), today: opts.today });
    const diagnoses = new Map<string, Diagnosis>();
    for (const e of problems) diagnoses.set(e.key, await diagnose(e, payload, vencord));

    const stamp = payload.meta.scannedAt.replace(/[-:.TZ]/g, "").slice(0, 14);
    const outDir = join(opts.outRoot, `${payload.meta.branch}-${payload.meta.buildNumber}-${stamp}`);
    mkdirSync(outDir, { recursive: true });

    const readSource = (file: string) => {
        const p = join(opts.mcordRoot, file);
        return existsSync(p) ? readFileSync(p, "utf8") : null;
    };
    const briefPath = join(outDir, "fix-brief.md");
    writeFileSync(briefPath, renderBrief({ payload, entries, diagnoses, mcordRoot: opts.mcordRoot, readSource }));
    writeFileSync(join(outDir, "payload.json"), mask(JSON.stringify(payload)));

    let baselineUpdated = 0;
    if (!payload.meta.partial) {
        const updates = baselineUpdates(entries, payload, { acceptDrift: opts.acceptDrift });
        baselineUpdated = Object.keys(updates).length;
        saveBaseline(blPath, applyUpdates(baseline, updates));
    } else {
        logger.warn("Eksik tarama: baseline güncellenmedi.");
    }

    return { outDir, briefPath, entries, problems: problems.length, baselineUpdated };
}
```

- [ ] **Step 4: offlineCli.ts**

`scanner/src/offlineCli.ts`:
```ts
/**
 * Kaydedilmiş bir payload üzerinde motoru yeniden koşturur (Discord açmadan):
 *   node src/offlineCli.ts <out/.../payload.json> [--mcord <yol>] [--accept-drift]
 */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { parsePayload } from "./scan/payload.ts";
import { runScan } from "./scan/runScan.ts";

const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith("--"));
const mcordIdx = args.indexOf("--mcord");
if (!file) {
    console.error("kullanım: node src/offlineCli.ts <payload.json> [--mcord <yol>]");
    process.exit(2);
}
const root = resolve(import.meta.dirname, "..");
const mcordRoot = mcordIdx >= 0 ? resolve(args[mcordIdx + 1]) : resolve(root, "..");

try {
    const res = await runScan(parsePayload(readFileSync(resolve(file), "utf8")), {
        mcordRoot, outRoot: join(root, "out"), vencordCacheDir: join(root, ".cache", "vencord"),
        acceptDrift: args.includes("--accept-drift")
    });
    console.log(`Sorunlu: ${res.problems} · baseline güncellenen: ${res.baselineUpdated}`);
    console.log(`Brief: ${res.briefPath}`);
    process.exit(res.problems > 0 ? 1 : 0);
} catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(2);
}
```

`scanner/package.json` `scripts`'e ekle:
```json
    "offline": "node src/offlineCli.ts",
```

- [ ] **Step 5: Testler, typecheck**

```bash
pnpm vitest run test/runScan.test.ts
pnpm test
pnpm typecheck
```
Expected: hepsi PASS. `typecheck` hata verirse düzelt (sık görülen: `import type` eksik, `.ts` uzantısı eksik).

- [ ] **Step 6: Commit**

```bash
git add src/scan/runScan.ts src/offlineCli.ts test/runScan.test.ts package.json
git commit -m "scan: orkestrasyon ve çevrimdışı CLI"
```

---

### Task 10: Electron kabuğu, token deposu, Discord penceresi ve toplayıcı

**Files:**
- Modify: `scanner/package.json` (devDeps: `electron`, `esbuild`; scripts)
- Modify: `scanner/pnpm-workspace.yaml` (`allowBuilds`)
- Create: `scanner/app/build.mjs`
- Create: `scanner/app/tokenStore.ts`
- Create: `scanner/app/discordWindow.ts`
- Create: `scanner/app/preload-discord.ts`
- Create: `scanner/app/collector.ts`
- Create: `scanner/app/core.ts` (ortak yapılandırma + `scanOnce`)
- Create: `scanner/app/main.ts` (bu task'ta yalnız CLI modu, UI Task 11'de)
- Modify: `scanner/tsconfig.json` (`include`'a `app/**/*.ts`)

**Interfaces:**
- Consumes: `runScan`, `RunScanResult` (Task 9). `ScanPayload` ve parçaları (Task 1). `registerSecret`, `mask` (`src/util/secrets.ts`). Task 2'deki sink sözleşmesi: sıra `meta` → `patches` → `finds` → `report` → `modules`* → `done`, hata olursa `failed`.
- Produces:
  - `tokenStore.ts`: `createTokenStore(stateDir: string): { get(): string | null; set(token: string): void; clear(): void }`
  - `discordWindow.ts`:
    - `type Branch = "stable" | "canary" | "ptb"`
    - `branchUrl(branch: Branch, path: "/app" | "/login"): string`
    - `scannerSession(): Electron.Session`: bellekte, `mcord-scanner` bölümü, ağ izin listesi kurulmuş.
    - `openDiscordWindow(opts: { branch: Branch; mode: "scan" | "login"; show: boolean }): BrowserWindow`
    - `loginWithDiscord(branch: Branch): Promise<string>`: görünür pencerede kullanıcı giriş yapar, token döner.
    - `ipcMain` kanalları: `scanner:init` (sync, `{ mode, token, renderer }` döner), `scanner:sink`, `scanner:token`.
  - `collector.ts`:
    - `interface Progress { phase: string; detail: string }`
    - `collect(opts: { branch: Branch; mcordRoot: string; token: string; show: boolean; onProgress: (p: Progress) => void }): Promise<ScanPayload>`
    - `buildReporter(mcordRoot: string, onProgress): Promise<string>`: `dist/renderer.js` içeriğini döner.
  - `core.ts`: `config: { mcordRoot: string; tokens(): TokenStore; outDir: string; vencordCache: string }`, `scanOnce(branch: Branch, show: boolean, onProgress): Promise<RunScanResult>`, `arg(name: string): string | null`
  - `main.ts` CLI: `electron app-dist/main.js --cli --branch <b> [--mcord <yol>] [--show] [--accept-drift]`. Exit kodları: 0 sorun yok, 1 sorun var, 2 hata ya da oturum yok.

- [ ] **Step 1: Bağımlılıklar ve build**

`scanner/pnpm-workspace.yaml`:
```yaml
packages: []

allowBuilds:
  electron: true
  esbuild: true
```

```bash
cd /c/Users/Berk/Desktop/MCord/scanner
pnpm add -D electron@^38.1.2 esbuild@^0.25.10
```
Beklenen: `node_modules/electron/dist/electron.exe` var. Yoksa `node node_modules/electron/install.js` çalıştır.

`scanner/package.json` `scripts`:
```json
    "build:app": "node app/build.mjs",
    "app": "node app/build.mjs && electron app-dist/main.js",
    "scan": "node app/build.mjs && electron app-dist/main.js --cli",
```

`scanner/tsconfig.json` `include`: `["src/**/*.ts", "test/**/*.ts", "app/**/*.ts"]`. App dosyaları Electron tiplerini kullanır. `"types": ["node"]` Electron tiplerini engellemez, çünkü Electron tipleri `import ... from "electron"` ile gelir.

`scanner/app/build.mjs`:
```js
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "app-dist");
mkdirSync(join(out, "ui"), { recursive: true });

const common = { bundle: true, sourcemap: "inline", logLevel: "warning", target: "node22" };

await Promise.all([
    build({ ...common, entryPoints: [join(root, "app/main.ts")], outfile: join(out, "main.js"), platform: "node", format: "cjs", external: ["electron", "typescript"] }),
    build({ ...common, entryPoints: [join(root, "app/preload-discord.ts")], outfile: join(out, "preload-discord.js"), platform: "node", format: "cjs", external: ["electron"] }),
    build({ ...common, entryPoints: [join(root, "app/preload-ui.ts")], outfile: join(out, "preload-ui.js"), platform: "node", format: "cjs", external: ["electron"] }),
    build({ ...common, entryPoints: [join(root, "app/ui/ui.ts")], outfile: join(out, "ui/ui.js"), platform: "browser", format: "iife", target: "chrome130" })
]);
copyFileSync(join(root, "app/ui/index.html"), join(out, "ui/index.html"));
console.log("app-dist hazır");
```
`typescript` external bırakılır (motorun `extract.ts`'i kullanır, bundle'a gömmek gereksiz büyük). Electron ana süreci `node_modules`'tan `require` eder.

Not: Bu task'ta `preload-ui.ts` ve `ui/ui.ts`, `ui/index.html` henüz yok. Build'in geçmesi için bu adımda boş iskelet oluştur. Task 11 doldurur:
```bash
mkdir -p app/ui
printf '// Task 11\nexport {};\n' > app/preload-ui.ts
printf '// Task 11\nexport {};\n' > app/ui/ui.ts
printf '<!doctype html><meta charset="utf-8"><title>MCord Scanner</title>\n' > app/ui/index.html
```

- [ ] **Step 2: tokenStore.ts**

`scanner/app/tokenStore.ts`:
```ts
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { safeStorage } from "electron";

import { registerSecret } from "../src/util/secrets.ts";

/** Token yalnızca DPAPI (Windows kullanıcısına bağlı) ile şifreli diske iner. */
export function createTokenStore(stateDir: string) {
    const file = join(stateDir, "token.bin");
    return {
        get(): string | null {
            if (!existsSync(file)) return null;
            if (!safeStorage.isEncryptionAvailable()) throw new Error("Windows şifreleme (DPAPI) kullanılamıyor.");
            const token = safeStorage.decryptString(readFileSync(file));
            registerSecret(token);
            return token;
        },
        set(token: string): void {
            if (!safeStorage.isEncryptionAvailable()) throw new Error("Windows şifreleme (DPAPI) kullanılamıyor.");
            registerSecret(token);
            mkdirSync(stateDir, { recursive: true });
            writeFileSync(file, safeStorage.encryptString(token));
        },
        clear(): void {
            rmSync(file, { force: true });
        }
    };
}
```

- [ ] **Step 3: discordWindow.ts**

`scanner/app/discordWindow.ts`:
```ts
import { join } from "node:path";

import { BrowserWindow, ipcMain, session } from "electron";

export type Branch = "stable" | "canary" | "ptb";

const HOSTS: Record<Branch, string> = { stable: "discord.com", canary: "canary.discord.com", ptb: "ptb.discord.com" };
export const branchUrl = (b: Branch, path: "/app" | "/login") => `https://${HOSTS[b]}${path}`;

// hcaptcha: Discord'un giriş sayfası captcha isteyebilir; kullanıcı kendisi çözer.
const ALLOWED = /^(?:[a-z0-9-]+\.)*(?:discord\.com|discordapp\.com|discordapp\.net|discord\.media|discord\.gg|hcaptcha\.com)$/i;

let cached: Electron.Session | null = null;

/** Bellekte oturum: diske çerez/localStorage yazılmaz; token yalnızca tokenStore'da. */
export function scannerSession(): Electron.Session {
    if (cached) return cached;
    const s = session.fromPartition("mcord-scanner", { cache: false });
    s.webRequest.onBeforeRequest((details, cb) => {
        try {
            const url = new URL(details.url);
            if (url.protocol === "devtools:" || url.protocol === "data:" || url.protocol === "blob:") return cb({});
            cb({ cancel: !ALLOWED.test(url.hostname) });
        } catch {
            cb({ cancel: true });
        }
    });
    s.setPermissionRequestHandler((_wc, _perm, cb) => cb(false));
    cached = s;
    return s;
}

interface InitState { mode: "scan" | "login"; token: string | null; renderer: string | null }
const pending = new Map<number, InitState>();

ipcMain.on("scanner:init", event => {
    event.returnValue = pending.get(event.sender.id) ?? { mode: "login", token: null, renderer: null };
});

export function openDiscordWindow(opts: { branch: Branch; mode: "scan" | "login"; show: boolean; token?: string | null; renderer?: string | null }): BrowserWindow {
    const win = new BrowserWindow({
        width: 1280, height: 800, show: opts.show, title: `MCord Scanner — Discord (${opts.branch})`,
        webPreferences: {
            session: scannerSession(),
            preload: join(__dirname, "preload-discord.js"),
            contextIsolation: true,
            sandbox: false,
            backgroundThrottling: false,
            nodeIntegration: false
        }
    });
    pending.set(win.webContents.id, { mode: opts.mode, token: opts.token ?? null, renderer: opts.renderer ?? null });
    win.on("closed", () => pending.delete(win.webContents.id));
    // Discord'un yeni pencere açmasını engelle (salt okunur kullanım).
    win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    return win;
}

/** Discord'un kendi giriş sayfası: kullanıcı girer, token localStorage'a düşünce yakalanır. */
export function loginWithDiscord(branch: Branch): Promise<string> {
    return new Promise((resolve, reject) => {
        const win = openDiscordWindow({ branch, mode: "login", show: true });
        const onToken = (event: Electron.IpcMainEvent, token: string) => {
            if (event.sender.id !== win.webContents.id) return;
            ipcMain.off("scanner:token", onToken);
            resolve(token);
            win.close();
        };
        ipcMain.on("scanner:token", onToken);
        win.on("closed", () => {
            ipcMain.off("scanner:token", onToken);
            reject(new Error("Giriş penceresi kapatıldı."));
        });
        void win.loadURL(branchUrl(branch, "/login"));
    });
}
```

- [ ] **Step 4: preload-discord.ts**

`scanner/app/preload-discord.ts`:
```ts
import { contextBridge, ipcRenderer, webFrame } from "electron";

/*
 * Discord sayfasının preload'ı. Sayfa script'lerinden ÖNCE çalışır:
 *  - scan modu: token'ı Discord'un okuduğu localStorage anahtarına koyar, sink
 *    köprüsünü açar, MCord reporter build'ini senkron enjekte eder (webpack
 *    başlamadan `Function.prototype.m` tuzağı kurulmuş olmalı).
 *  - login modu: kullanıcı giriş yapınca token'ı ana sürece bildirir.
 */

const init = ipcRenderer.sendSync("scanner:init") as { mode: "scan" | "login"; token: string | null; renderer: string | null };
const onDiscord = /(^|\.)discord\.com$/.test(location.hostname);

if (onDiscord && init.mode === "scan") {
    if (init.token) {
        try { localStorage.setItem("token", JSON.stringify(init.token)); } catch { /* sayfa izin vermezse giriş ekranı açılır, collector yakalar */ }
    }
    contextBridge.exposeInMainWorld("MCordScannerSink", (kind: string, data: unknown) => {
        ipcRenderer.send("scanner:sink", kind, data);
    });
    if (init.renderer) {
        try {
            webFrame.executeJavaScript(init.renderer);
        } catch (err) {
            ipcRenderer.send("scanner:sink", "failed", `renderer enjekte edilemedi: ${String(err)}`);
        }
    }
}

if (onDiscord && init.mode === "login") {
    const timer = setInterval(() => {
        let raw: string | null = null;
        try { raw = localStorage.getItem("token"); } catch { /* */ }
        if (!raw) return;
        clearInterval(timer);
        try {
            ipcRenderer.send("scanner:token", JSON.parse(raw) as string);
        } catch { /* biçim beklenmedikse bekle */ }
    }, 1000);
}
```

- [ ] **Step 5: collector.ts**

`scanner/app/collector.ts`:
```ts
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { ipcMain } from "electron";

import type { ScanFind, ScanMeta, ScanPatch, ScanPayload, ScanReport } from "../src/scan/payload.ts";
import { mask } from "../src/util/secrets.ts";
import { type Branch, branchUrl, openDiscordWindow } from "./discordWindow.ts";

export interface Progress { phase: string; detail: string }

const TOTAL_TIMEOUT_MS = 15 * 60_000;
const IDLE_TIMEOUT_MS = 90_000;

export function buildReporter(mcordRoot: string, onProgress: (p: Progress) => void): Promise<string> {
    onProgress({ phase: "derleme", detail: "pnpm buildReporter" });
    return new Promise((resolve, reject) => {
        const child = spawn("pnpm", ["buildReporter"], { cwd: mcordRoot, shell: true });
        let output = "";
        child.stdout.on("data", d => { output += d; });
        child.stderr.on("data", d => { output += d; });
        child.on("close", code => {
            const file = join(mcordRoot, "dist", "renderer.js");
            if (code !== 0 || !existsSync(file)) return reject(new Error(`buildReporter başarısız (kod ${code}):\n${output.slice(-2000)}`));
            resolve(readFileSync(file, "utf8"));
        });
    });
}

export async function collect(opts: { branch: Branch; mcordRoot: string; token: string; show: boolean; onProgress: (p: Progress) => void }): Promise<ScanPayload> {
    const renderer = await buildReporter(opts.mcordRoot, opts.onProgress);
    const win = openDiscordWindow({ branch: opts.branch, mode: "scan", show: opts.show, token: opts.token, renderer });

    const parts = {
        meta: null as ScanMeta | null,
        patches: [] as ScanPatch[],
        finds: [] as ScanFind[],
        report: { badPatches: [], erroredPatches: [], badWebpackFinds: [] } as ScanReport,
        modules: {} as Record<string, string>
    };

    return new Promise<ScanPayload>((resolve, reject) => {
        let idleTimer: NodeJS.Timeout;
        let finished = false;

        const finish = (partial: boolean, error?: Error) => {
            if (finished) return;
            finished = true;
            clearTimeout(totalTimer);
            clearTimeout(idleTimer);
            ipcMain.off("scanner:sink", onSink);
            if (!win.isDestroyed()) win.close();
            if (error && Object.keys(parts.modules).length === 0) return reject(error);
            const meta: ScanMeta = parts.meta ?? {
                branch: opts.branch, buildNumber: -1, buildHash: null, mcordCommit: "?", moduleCount: Object.keys(parts.modules).length,
                skippedChunks: [], scannedAt: new Date().toISOString(), partial: true
            };
            resolve({ format: "mcord-scan/1", meta: { ...meta, branch: opts.branch, partial: partial || meta.partial }, patches: parts.patches, finds: parts.finds, report: parts.report, modules: parts.modules });
        };

        const bump = () => {
            clearTimeout(idleTimer);
            idleTimer = setTimeout(() => finish(true, new Error("90 sn boyunca ilerleme yok (zaman aşımı).")), IDLE_TIMEOUT_MS);
        };
        const totalTimer = setTimeout(() => finish(true, new Error("15 dk içinde bitmedi (zaman aşımı).")), TOTAL_TIMEOUT_MS);

        const onSink = (event: Electron.IpcMainEvent, kind: string, data: unknown) => {
            if (event.sender.id !== win.webContents.id) return;
            bump();
            switch (kind) {
                case "meta": parts.meta = data as ScanMeta; opts.onProgress({ phase: "aktarım", detail: `${parts.meta.moduleCount} modül` }); break;
                case "patches": parts.patches = data as ScanPatch[]; break;
                case "finds": parts.finds = data as ScanFind[]; break;
                case "report": parts.report = data as ScanReport; break;
                case "modules": Object.assign(parts.modules, data as Record<string, string>); opts.onProgress({ phase: "aktarım", detail: `${Object.keys(parts.modules).length} modül alındı` }); break;
                case "done": finish(false); break;
                case "failed": finish(true, new Error(mask(`Reporter hata verdi: ${String(data)}`))); break;
            }
        };
        ipcMain.on("scanner:sink", onSink);

        // Electron 38: mesaj `event.message`'ta; konumsal argümanlar eski sürümler için.
        win.webContents.on("console-message", ((event: { message?: string }, _level?: number, legacy?: string) => {
            const message = event.message ?? legacy ?? "";
            if (!message.startsWith("[REPORTER_")) return;
            bump();
            const [tag, ...rest] = message.split(" ");
            if (tag === "[REPORTER_PHASE]" || tag === "[REPORTER_PROGRESS]") opts.onProgress({ phase: "tarama", detail: mask(rest.join(" ").slice(0, 160)) });
        }) as any);
        win.webContents.on("did-navigate", (_e, url) => {
            if (new URL(url).pathname.startsWith("/login")) finish(true, new Error("Token geçersiz ya da süresi dolmuş: Discord giriş ekranına yönlendirdi."));
        });
        win.webContents.on("render-process-gone", (_e, details) => finish(true, new Error(`Discord sayfası çöktü: ${details.reason}`)));

        bump();
        opts.onProgress({ phase: "açılış", detail: branchUrl(opts.branch, "/app") });
        void win.loadURL(branchUrl(opts.branch, "/app"));
    });
}
```

- [ ] **Step 6: core.ts ve main.ts (CLI modu)**

`uiMain.ts` ile `main.ts` arasında döngü olmasın diye ortak durum `app/core.ts`'te. `main.ts` yalnızca giriş noktası.

`scanner/app/core.ts`:
```ts
import { join, resolve } from "node:path";

import { runScan } from "../src/scan/runScan.ts";
import { collect, type Progress } from "./collector.ts";
import type { Branch } from "./discordWindow.ts";
import { createTokenStore } from "./tokenStore.ts";

const SCANNER_ROOT = resolve(__dirname, "..");
const STATE_DIR = join(SCANNER_ROOT, ".state");
const OUT_DIR = join(SCANNER_ROOT, "out");
const VENCORD_CACHE = join(SCANNER_ROOT, ".cache", "vencord");

function arg(name: string): string | null {
    const i = process.argv.indexOf(name);
    return i >= 0 ? process.argv[i + 1] ?? null : null;
}

export const config = {
    mcordRoot: resolve(arg("--mcord") ?? join(SCANNER_ROOT, "..")),
    tokens: () => createTokenStore(STATE_DIR),
    outDir: OUT_DIR,
    vencordCache: VENCORD_CACHE
};

export async function scanOnce(branch: Branch, show: boolean, onProgress: (p: Progress) => void, acceptDrift = false) {
    const token = config.tokens().get();
    if (!token) throw new Error("Kayıtlı oturum yok: önce `pnpm app` ile giriş yap.");
    const payload = await collect({ branch, mcordRoot: config.mcordRoot, token, show, onProgress });
    onProgress({ phase: "analiz", detail: "teşhis ve brief" });
    return runScan(payload, { mcordRoot: config.mcordRoot, outRoot: config.outDir, vencordCacheDir: config.vencordCache, acceptDrift });
}

export { arg };
```

`scanner/app/main.ts`:
```ts
import { app } from "electron";

import { arg, scanOnce } from "./core.ts";
import type { Branch } from "./discordWindow.ts";
import { startUi } from "./uiMain.ts";

async function runCli(): Promise<number> {
    const branch = (arg("--branch") ?? "stable") as Branch;
    try {
        const res = await scanOnce(branch, process.argv.includes("--show"), p => console.log(`[${p.phase}] ${p.detail}`), process.argv.includes("--accept-drift"));
        console.log(`\nSorunlu: ${res.problems} · baseline güncellenen: ${res.baselineUpdated}`);
        console.log(`Brief: ${res.briefPath}`);
        return res.problems > 0 ? 1 : 0;
    } catch (err) {
        console.error(err instanceof Error ? err.message : String(err));
        return 2;
    }
}

app.whenReady().then(async () => {
    if (process.argv.includes("--cli")) {
        app.exit(await runCli());
        return;
    }
    startUi();
});

app.on("window-all-closed", () => {
    if (!process.argv.includes("--cli")) app.quit();
});
```

Task 11 `app/uiMain.ts`'i ekleyene kadar build'in geçmesi için geçici iskelet:
```bash
printf 'export function startUi(): void {\n    console.log("UI Task 11");\n}\n' > app/uiMain.ts
```

- [ ] **Step 7: Build ve duman testi**

```bash
pnpm build:app
pnpm typecheck
pnpm electron app-dist/main.js --cli --branch stable; echo "exit=$?"
```
Beklenen: build ve typecheck temiz. Son komut `Kayıtlı oturum yok: önce \`pnpm app\` ile giriş yap.` basar ve `exit=2` verir. Gerçek tarama Task 12'de.

- [ ] **Step 8: Commit**

```bash
git add package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json app/
git commit -m "app: Electron kabuğu, DPAPI token deposu, Discord penceresi ve toplayıcı (CLI)"
```

---

### Task 11: Arayüz (giriş ve ana ekran)

**Files:**
- Create: `scanner/app/uiMain.ts` (Task 10'daki iskeleti değiştir)
- Modify: `scanner/app/preload-ui.ts`
- Modify: `scanner/app/ui/index.html`
- Modify: `scanner/app/ui/ui.ts`

**Interfaces:**
- Consumes: `config`, `scanOnce` (`app/core.ts`). `loginWithDiscord`, `Branch` (`app/discordWindow.ts`). `RunScanResult`, `Entry` (Task 9, 5).
- Produces: `window.scanner` API'si (preload-ui):
  - `state(): Promise<{ loggedIn: boolean; mcordRoot: string }>`
  - `loginToken(token: string): Promise<void>`
  - `loginDiscord(branch: Branch): Promise<void>`
  - `logout(): Promise<void>`
  - `scan(branch: Branch, show: boolean): Promise<{ briefPath: string; problems: number; rows: Array<{ status: string; plugin: string | null; label: string; location: string }> }>`
  - `openBrief(path: string): Promise<void>`
  - `copyBrief(path: string): Promise<void>`
  - `onProgress(cb: (p: { phase: string; detail: string }) => void): void`

- [ ] **Step 1: uiMain.ts**

`scanner/app/uiMain.ts`:
```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { BrowserWindow, clipboard, ipcMain, shell } from "electron";

import { config, scanOnce } from "./core.ts";
import { type Branch, loginWithDiscord } from "./discordWindow.ts";

export function startUi(): void {
    const win = new BrowserWindow({
        width: 980, height: 720, title: "MCord Scanner",
        webPreferences: { preload: join(__dirname, "preload-ui.js"), contextIsolation: true, sandbox: false }
    });
    win.setMenuBarVisibility(false);

    ipcMain.handle("ui:state", () => ({ loggedIn: config.tokens().get() != null, mcordRoot: config.mcordRoot }));
    ipcMain.handle("ui:loginToken", (_e, token: string) => {
        const t = token.trim().replace(/^"|"$/g, "");
        if (t.length < 50) throw new Error("Bu bir Discord token'ına benzemiyor.");
        config.tokens().set(t);
    });
    ipcMain.handle("ui:loginDiscord", async (_e, branch: Branch) => {
        config.tokens().set(await loginWithDiscord(branch));
    });
    ipcMain.handle("ui:logout", () => config.tokens().clear());
    ipcMain.handle("ui:scan", async (_e, branch: Branch, show: boolean) => {
        const res = await scanOnce(branch, show, p => win.webContents.send("ui:progress", p));
        const rows = res.entries
            .filter(e => e.status !== "sağlam")
            .map(e => ({ status: e.status, plugin: e.plugin, label: e.label.slice(0, 100), location: e.locations[0] ? `${e.locations[0].file}:${e.locations[0].line}` : "—" }));
        return { briefPath: res.briefPath, problems: res.problems, rows };
    });
    ipcMain.handle("ui:openBrief", (_e, path: string) => shell.openPath(path));
    ipcMain.handle("ui:copyBrief", (_e, path: string) => clipboard.writeText(readFileSync(path, "utf8")));

    void win.loadFile(join(__dirname, "ui", "index.html"));
}
```

- [ ] **Step 2: preload-ui.ts**

`scanner/app/preload-ui.ts`:
```ts
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("scanner", {
    state: () => ipcRenderer.invoke("ui:state"),
    loginToken: (token: string) => ipcRenderer.invoke("ui:loginToken", token),
    loginDiscord: (branch: string) => ipcRenderer.invoke("ui:loginDiscord", branch),
    logout: () => ipcRenderer.invoke("ui:logout"),
    scan: (branch: string, show: boolean) => ipcRenderer.invoke("ui:scan", branch, show),
    openBrief: (path: string) => ipcRenderer.invoke("ui:openBrief", path),
    copyBrief: (path: string) => ipcRenderer.invoke("ui:copyBrief", path),
    onProgress: (cb: (p: { phase: string; detail: string }) => void) => {
        ipcRenderer.on("ui:progress", (_e, p) => cb(p));
    }
});
```

- [ ] **Step 3: index.html**

`scanner/app/ui/index.html`:
```html
<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self' 'unsafe-inline'">
<title>MCord Scanner</title>
<style>
  :root { --bg:#1e1f22; --panel:#2b2d31; --text:#dbdee1; --muted:#949ba4; --accent:#5865f2; --bad:#f23f43; --warn:#f0b232; --ok:#23a55a; }
  * { box-sizing:border-box; }
  body { margin:0; font:14px/1.5 "Segoe UI",system-ui,sans-serif; background:var(--bg); color:var(--text); }
  main { max-width:900px; margin:0 auto; padding:24px 16px; }
  h1 { font-size:20px; margin:0 0 16px; }
  .panel { background:var(--panel); border-radius:8px; padding:16px; margin-bottom:16px; }
  input[type=password], select { width:100%; padding:10px; border-radius:6px; border:1px solid #3f4147; background:#1e1f22; color:var(--text); }
  button { padding:9px 16px; border:0; border-radius:6px; background:var(--accent); color:#fff; cursor:pointer; font-weight:600; }
  button.secondary { background:#4e5058; }
  button:disabled { opacity:.5; cursor:default; }
  .row { display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-top:10px; }
  .muted { color:var(--muted); font-size:12px; }
  .hidden { display:none; }
  #log { font:12px/1.4 Consolas,monospace; color:var(--muted); max-height:120px; overflow:auto; white-space:pre-wrap; }
  table { width:100%; border-collapse:collapse; font-size:13px; }
  td, th { text-align:left; padding:6px 8px; border-bottom:1px solid #3f4147; vertical-align:top; word-break:break-word; }
  .s-hata, .s-kırık-find, .s-kırık-match { color:var(--bad); }
  .s-şekil-değişti, .s-çoklu, .s-kaymış { color:var(--warn); }
  .error { color:var(--bad); }
</style>
</head>
<body>
<main>
  <h1>MCord Scanner</h1>

  <section id="login" class="panel hidden">
    <strong>Giriş</strong>
    <p class="muted">Token yalnızca bu bilgisayarda, Windows şifrelemesiyle saklanır. Ana hesabın yerine yan hesap önerilir.</p>
    <input id="token" type="password" placeholder="Discord token" autocomplete="off">
    <div class="row">
      <button id="btnToken">Token ile gir</button>
      <button id="btnDiscord" class="secondary">Discord'un giriş sayfasıyla gir</button>
    </div>
    <p id="loginError" class="error"></p>
  </section>

  <section id="home" class="panel hidden">
    <div class="row">
      <select id="branch" style="width:auto">
        <option value="stable">Stable</option>
        <option value="canary">Canary</option>
        <option value="ptb">PTB</option>
      </select>
      <label class="muted"><input id="show" type="checkbox"> Discord'u göster</label>
      <button id="btnScan">Tara</button>
      <button id="btnLogout" class="secondary">Çıkış yap</button>
    </div>
    <p class="muted" id="mcord"></p>
    <div id="log"></div>
  </section>

  <section id="result" class="panel hidden">
    <div class="row">
      <strong id="summary"></strong>
      <button id="btnOpen" class="secondary">Brief'i aç</button>
      <button id="btnCopy">Brief'i kopyala</button>
    </div>
    <p class="muted" id="briefPath"></p>
    <table><thead><tr><th>Durum</th><th>Eklenti</th><th>Tanım</th><th>Yer</th></tr></thead><tbody id="rows"></tbody></table>
  </section>
</main>
<script src="ui.js"></script>
</body>
</html>
```

- [ ] **Step 4: ui.ts**

`scanner/app/ui/ui.ts`:
```ts
type Row = { status: string; plugin: string | null; label: string; location: string };
interface ScannerApi {
    state(): Promise<{ loggedIn: boolean; mcordRoot: string }>;
    loginToken(t: string): Promise<void>;
    loginDiscord(b: string): Promise<void>;
    logout(): Promise<void>;
    scan(b: string, show: boolean): Promise<{ briefPath: string; problems: number; rows: Row[] }>;
    openBrief(p: string): Promise<void>;
    copyBrief(p: string): Promise<void>;
    onProgress(cb: (p: { phase: string; detail: string }) => void): void;
}
const api = (window as unknown as { scanner: ScannerApi }).scanner;
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const errText = (e: unknown) => String(e instanceof Error ? e.message : e).replace(/^Error invoking remote method '[^']+': (Error: )?/, "");

let briefPath = "";

async function refresh(): Promise<void> {
    const s = await api.state();
    $("login").classList.toggle("hidden", s.loggedIn);
    $("home").classList.toggle("hidden", !s.loggedIn);
    $("mcord").textContent = `MCord: ${s.mcordRoot}`;
}

function log(line: string): void {
    const el = $("log");
    el.textContent = `${el.textContent}${line}\n`.split("\n").slice(-200).join("\n");
    el.scrollTop = el.scrollHeight;
}

api.onProgress(p => log(`[${p.phase}] ${p.detail}`));

$("btnToken").addEventListener("click", async () => {
    $("loginError").textContent = "";
    try {
        await api.loginToken($<HTMLInputElement>("token").value);
        $<HTMLInputElement>("token").value = "";
        await refresh();
    } catch (e) { $("loginError").textContent = errText(e); }
});

$("btnDiscord").addEventListener("click", async () => {
    $("loginError").textContent = "";
    try { await api.loginDiscord("stable"); await refresh(); } catch (e) { $("loginError").textContent = errText(e); }
});

$("btnLogout").addEventListener("click", async () => { await api.logout(); $("result").classList.add("hidden"); await refresh(); });

$("btnScan").addEventListener("click", async () => {
    const btn = $<HTMLButtonElement>("btnScan");
    btn.disabled = true;
    $("log").textContent = "";
    $("result").classList.add("hidden");
    try {
        const res = await api.scan($<HTMLSelectElement>("branch").value, $<HTMLInputElement>("show").checked);
        briefPath = res.briefPath;
        $("summary").textContent = res.problems === 0 ? "✅ Sorun yok" : `💥 ${res.problems} sorun`;
        $("briefPath").textContent = res.briefPath;
        const tbody = $("rows");
        tbody.replaceChildren(...res.rows.map(r => {
            const tr = document.createElement("tr");
            for (const [text, cls] of [[r.status, `s-${r.status}`], [r.plugin ?? "(arama)", ""], [r.label, ""], [r.location, ""]] as const) {
                const td = document.createElement("td");
                td.textContent = text;
                if (cls) td.className = cls;
                tr.append(td);
            }
            return tr;
        }));
        $("result").classList.remove("hidden");
    } catch (e) {
        log(`HATA: ${errText(e)}`);
        await refresh();
    } finally {
        btn.disabled = false;
    }
});

$("btnOpen").addEventListener("click", () => void api.openBrief(briefPath));
$("btnCopy").addEventListener("click", async () => { await api.copyBrief(briefPath); log("Brief panoya kopyalandı."); });

void refresh();
```

- [ ] **Step 5: Build ve açılış kontrolü**

```bash
pnpm build:app
pnpm typecheck
pnpm app
```
Beklenen: Pencere açılır ve giriş ekranı görünür. Kısa bir metinle (örn. `abc`) "Token ile gir"e basınca "Bu bir Discord token'ına benzemiyor." mesajı çıkar. Pencereyi kapat. Gerçek token'ı **kullanıcı** girer (Task 12). Agent token girmez.

- [ ] **Step 6: Commit**

```bash
git add app/
git commit -m "app: giriş ve ana ekran arayüzü"
```

---

### Task 12: Uçtan uca koşu, README, MCord merge

**Files:**
- Modify: `scanner/README.md`
- MCord worktree: `baselines/stable.json` (ilk gerçek koşunun çıktısı)

**Interfaces:**
- Consumes: Task 1–11'in tamamı.

- [ ] **Step 1: MCord değişikliklerini ana checkout'a getir**

Scanner varsayılan olarak `C:\Users\Berk\Desktop\MCord` (ana checkout) üzerinde `pnpm buildReporter` çalıştırır. Task 2'deki reporter değişikliği önce oraya ulaşmalı:

```bash
cd /c/Users/Berk/Desktop/MCord/.claude/worktrees/vencord-invalid-user-plugin-a90642
pnpm test && pnpm buildReporter
git -C /c/Users/Berk/Desktop/MCord status --short
```
Ana checkout'ta commit'lenmemiş değişiklik varsa DUR ve kullanıcıya sor. Temizse:
```bash
git -C /c/Users/Berk/Desktop/MCord checkout main
git -C /c/Users/Berk/Desktop/MCord merge --ff-only claude/scanner-discord-module-c77e1d
git -C /c/Users/Berk/Desktop/MCord push origin main
```
ff-only başarısız olursa önce worktree dalını main üzerine rebase et (`git rebase main`), testleri tekrar koş, sonra merge et.

- [ ] **Step 2: Kullanıcı girişi (elle, kullanıcı yapar)**

Kullanıcıya şunu söyle: "`cd scanner && pnpm app` ile app'i aç, token'ını yapıştırıp 'Token ile gir'e bas (ya da Discord'un giriş sayfasını kullan)." Token'ı agent GİRMEZ ve istemez.

- [ ] **Step 3: İlk gerçek tarama**

Kullanıcı girişten sonra:
```bash
cd /c/Users/Berk/Desktop/MCord/scanner
pnpm scan --branch stable --show
```
Beklenen:
- İlerleme satırları (`[derleme]`, `[açılış]`, `[tarama] …`, `[aktarım] … modül`, `[analiz]`)
- `Brief: …\fix-brief.md`
- `baselines/stable.json` oluşur

Kontrol listesi:
- Modül sayısı ≥ 15000. Çok düşükse lazy chunk'lar yüklenmemiştir, `--show` ile Discord'u izle.
- `grep -c "«token»\|mfa\." out/*/fix-brief.md` ile token sızıntısı yok. Token biçimli dize de yok.
- Brief boyutu < 500 KB.
- Sorun sayısı, CI reporter'ın son koşusuyla (0 kırık) büyük ölçüde tutarlı olmalı. Fark varsa ("kırık-match" yeni bir sinyal olduğu için beklenebilir) brief'teki ilk 3 kaydı elle doğrula.

Zaman aşımı veya giriş sayfasına yönlendirme olursa hata mesajını oku. Token sorunuysa kullanıcıdan yeniden giriş iste. Başka bir sorunsa `--show` ile tekrar koş ve `[tarama]` satırlarında nerede durduğunu bul.

- [ ] **Step 4: Çevrimdışı tekrar koşuyu doğrula**

```bash
pnpm offline out/<son-klasör>/payload.json
```
Beklenen: aynı sorun sayısı, yeni bir `out/` klasörü.

- [ ] **Step 5: baseline'ı commit'le (MCord)**

```bash
cd /c/Users/Berk/Desktop/MCord
git add baselines/stable.json
git commit -m "baselines: stable ilk tarama"
git push origin main
```

- [ ] **Step 6: README**

`scanner/README.md` en başına, mevcut "DevTools ile tarama" bölümünün ÖNÜNE ekle (eski bölüm "Eski yöntem" başlığıyla kalır):
```markdown
# MCord Scanner

Discord'u kendi oturumunda açıp MCord'un tüm patch/finder'larını gerçek koşulda dener; kırık ya da
kaymış olanlar için Claude'a yönelik `fix-brief.md` üretir.

## Kullanım

1. `pnpm install` (ilk sefer)
2. `pnpm app` → ilk açılışta token ile ya da Discord'un giriş sayfasıyla gir (yan hesap önerilir).
3. Dalı seç → **Tara** (3-5 dk) → **Brief'i kopyala** → Claude'a yapıştır.

Komut satırı (Claude'un doğrulaması için): `pnpm scan --branch stable [--show] [--mcord <yol>] [--accept-drift]`
(`--accept-drift`: incelenip doğru bulunan "kaymış" kayıtların baseline'ını yeni hâle geçirir)
(çıkış kodu: 0 sorun yok, 1 sorun var, 2 hata/oturum yok).
Kaydedilmiş veriyle yeniden analiz: `pnpm offline out/<klasör>/payload.json`.

- Token: `.state/token.bin`, Windows DPAPI ile şifreli. **Çıkış yap** siler. Log/brief'e girmez.
- Discord oturumu bellekte tutulur, diske çerez/localStorage yazılmaz.
- Baseline'lar MCord reposunda `baselines/<dal>.json` (commit'lenir).
- Hesap salt okunur kullanılır: mesaj gönderme, sunucuya katılma, ayar değiştirme yok.

## Eski yöntem
```
Mevcut `# Discord Module Webpack Finder (yerel, MCord içinde)` başlığını `## DevTools ile dump (eski yöntem)` olarak değiştir.

```bash
cd /c/Users/Berk/Desktop/MCord/scanner
git add README.md
git commit -m "README: app kullanımı"
```

- [ ] **Step 7: Hafıza**

`C:\Users\Berk\.claude\projects\C--Users-Berk-Desktop-MCord\memory\` altında `mcord-scanner-app.md` oluştur (type: project):
- nerede (`scanner/`, yerel git, remote yok)
- nasıl koşulur (`pnpm app`, `pnpm scan --branch`, `pnpm offline`)
- brief akışı (kullanıcı brief'i yapıştırır → Claude kurallara göre düzeltir → `pnpm scan` ile doğrular → commit)
- baseline'lar `baselines/`'ta

`MEMORY.md`'ye tek satır pointer ekle.

---

## Self-review notları

- Spec kapsamı:
  - kabuk → Task 10/11
  - toplayıcı → Task 2/10
  - motor ve durumlar → Task 5
  - baseline → Task 3/4
  - teşhis → Task 6/7/8
  - brief → Task 8
  - CLI → Task 9/10
  - hata durumları → Task 10 (token geçersiz: `did-navigate /login`; zaman aşımları; build hatası) ve Task 9 (eksik taramada baseline'a dokunmama)
  - test → her motor task'ı
  - ağ izin listesi → Task 10 `scannerSession`
  - salt okunur → preload yalnızca token tohumlar ve sink açar, `setWindowOpenHandler` deny, izin istekleri red
- Tip tutarlılığı: `ScanPayload` alanları Task 1 ↔ Task 2 (`scannerExport.ts`) ↔ Task 10 (`collector.ts`) aynı. `Entry`/`Diagnosis` alan adları Task 5/8/9/11'de aynı.
- Bilinen yaklaşıklık:
  - Finder kayıtları plugin'e bağlanamıyor (arama geçmişinde plugin yok), bu yüzden `plugin: null`. Konum `describeSpec` eşleşmesiyle bulunur.
  - Arama etiketinde boşluk farkları `norm()` ile tolere edilir.
