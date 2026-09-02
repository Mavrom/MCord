# MCord Installer — pencereli GUI — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `scripts/installer/` konsol aracını, aynı kur/kaldır mantığını koruyarak, çift tıklanınca açılan koyu temalı pencereli bir `MCordInstaller.exe`'ye dönüştürmek (CLI modu korunur).

**Architecture:** UI'dan bağımsız saf mantık çekirdeği (`src/core/`, vitest ile test edilir) + iki giriş noktası: `src/cli.mjs` (mevcut readline akışı) ve `src/gui/main.mjs` (`@webviewjs/webview` penceresi, React UI'ı `mcord://` protokolüyle servis eder, çekirdeği `webview.expose` ile açar). `src/index.mjs` argümana bakıp birini seçer.

**Tech Stack:** Node ESM (`.mjs`), `@webviewjs/webview` (Rust wry/tao, sistem WebView2), React 19 + esbuild (UI, tek self-contained HTML'e bundle), `@yao-pkg/pkg` (tek exe), vitest (birim testleri).

## Global Constraints

- Platform: **yalnızca Windows** (`process.platform === "win32"`); Linux/macOS kapsam dışı.
- Yönetici hakkı **istenmez** — Discord `%LocalAppData%` altında, UAC yok.
- Asar dosya işlemleri **`node:fs`** ile (Electron'a özel `original-fs` DEĞİL — standalone süreçte `fs` yamalanmamıştır ve `original-fs` paketlenmiş exe'de `Cannot find module` verir).
- Lisans başlığı: her yeni `.mjs`/`.tsx` dosyası şu blokla başlar:
  ```
  /*
   * MCord, a Discord client modification
   * Copyright (c) 2026 Mavrom
   * SPDX-License-Identifier: PolyForm-Strict-1.0.0
   */
  ```
- Commit mesajları ve kod yorumları Türkçe (mevcut repo diliyle tutarlı).
- Çekirdek fonksiyonlar UI sınırına **`throw` etmez**; `Result` (`{ok, ...}`) döner.
- Exe adı **`MCordInstaller.exe`** (değişmez).
- Git commit'lerinde Claude attribution / `Co-Authored-By` trailer **yok** (proje tercihi).

---

## Dosya yapısı

```
scripts/installer/
  package.json            # MODIFY: + deps, + build script, pkg.assets
  tsconfig.json           # CREATE: UI için react-jsx tsconfig
  build.mjs               # CREATE: esbuild — src/gui/ui → dist-ui/index.html (inline)
  src/
    core/
      result.mjs          # CREATE: ok()/err() + hata kodları
      discord.mjs         # CREATE: (mevcut src/discord.mjs taşınır + enjekte edilebilir runner + running alanı)
      install.mjs         # CREATE: (mevcut src/install.mjs taşınır; original-fs→node:fs; repair)
      source.mjs          # CREATE: resolveSourceAsar (mevcut index.mjs'den çıkarılır)
      index.mjs           # CREATE: Result döndüren dış API (detectInstalls, install, ...)
      discord.test.mjs    # CREATE
      install.test.mjs    # CREATE
      index.test.mjs      # CREATE
    gui/
      main.mjs            # CREATE: webview penceresi + protokol + expose
      ui/
        index.html        # CREATE: esbuild şablonu
        main.tsx          # CREATE: React kök
        App.tsx           # CREATE: durum makinesi
        theme.css         # CREATE: Discord koyu teması
        messages.mjs      # CREATE: hata kodu → Türkçe metin (vitest'lenir)
        messages.test.mjs # CREATE
        components/
          BranchList.tsx  # CREATE
          ActionBar.tsx   # CREATE
          ProgressLog.tsx # CREATE
          ResultScreen.tsx# CREATE
        api.ts            # CREATE: window.core tip sarmalayıcısı
    cli.mjs               # CREATE: (mevcut src/index.mjs mantığı, core API'siyle)
    index.mjs             # CREATE: dispatcher (arg → cli, yoksa gui)
  src/discord.mjs         # DELETE (core/'a taşındı)
  src/install.mjs         # DELETE (core/'a taşındı)
  README.md              # MODIFY: GUI + CLI kullanımı

vitest.config.ts          # MODIFY: include'a scripts/installer testleri
tsconfig.json             # MODIFY: exclude'a scripts/installer
package.json              # MODIFY: typecheck script'i installer tsconfig'i de çalıştırır
.github/workflows/release.yml  # MODIFY: package'tan önce UI build
.github/workflows/build.yml    # MODIFY: windows job (installer smoke)
```

---

## Task 1: Çekirdek mantık — `src/core/` + birim testleri

**Files:**
- Create: `scripts/installer/src/core/result.mjs`
- Create: `scripts/installer/src/core/discord.mjs`
- Create: `scripts/installer/src/core/install.mjs`
- Create: `scripts/installer/src/core/source.mjs`
- Create: `scripts/installer/src/core/index.mjs`
- Create: `scripts/installer/src/core/discord.test.mjs`
- Create: `scripts/installer/src/core/install.test.mjs`
- Create: `scripts/installer/src/core/index.test.mjs`
- Modify: `vitest.config.ts` (include)
- Delete: `scripts/installer/src/discord.mjs`, `scripts/installer/src/install.mjs` (Task 2 sonunda; Task 1'de kalabilirler)

**Interfaces:**
- Produces:
  - `result.mjs`: `ok(data) → {ok:true, data}`, `err(code, message) → {ok:false, code, message}`
  - `discord.mjs`:
    - `BRANCHES: {id,name,dir,exe}[]`
    - `assertWindows(platform=process.platform): void` (Windows değilse `throw`)
    - `discoverInstalls({localAppData=process.env.LOCALAPPDATA} = {}): Install[]`
      where `Install = {id,name,dir,exe,version,root,resources,appAsar,backupAsar,devAppDir,executable}`
    - `isRunning(exeName, {run=defaultRun} = {}): boolean`
    - `killDiscord(exeName, {run=defaultRun} = {}): boolean`
    - `launchDiscord(executable, {run=defaultRun} = {}): boolean`
    - `defaultRun(file, args): string` (execFileSync sarmalayıcı; hata → `throw`)
  - `install.mjs`:
    - `sha256(path): string`
    - `getStatus(install): {installed:boolean, hasDevInjection:boolean}`
    - `installAsar(install, sourceAsar): {size:number, sha256:string}` (doğrulama başarısızsa `throw`)
    - `uninstallAsar(install): {restored:boolean}`
  - `source.mjs`: `resolveSourceAsar(guiDir): string` (bulamazsa `throw`)
  - `index.mjs` (dış API, hepsi `Result`):
    - `detectInstalls(deps={}): Result<BranchStatus[]>` — `BranchStatus = {id,name,version,installed,hasDevInjection,running}`
    - `install(branchId, sourceAsar, onProgress=()=>{}, deps={}): Result<{size,sha256}>`
    - `uninstall(branchId, onProgress=()=>{}, deps={}): Result<{restored}>`
    - `repair(branchId, sourceAsar, onProgress=()=>{}, deps={}): Result<{size,sha256}>`
    - `closeDiscord(branchId, deps={}): Result<{}>`
    - `launchDiscord(branchId, deps={}): Result<{}>`
    - Hata kodları: `NO_DISCORD, BRANCH_NOT_FOUND, DISCORD_RUNNING, DISCORD_STILL_RUNNING, ASAR_NOT_FOUND, SOURCE_NOT_FOUND, VERIFY_SIZE, VERIFY_SHA, NOT_INSTALLED, INTERNAL`

- [ ] **Step 1: `result.mjs` yaz**

```js
/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/** UI sınırına throw etmiyoruz; her dış çağrı bu tipi döndürür. */

export const ok = data => ({ ok: true, data });
export const err = (code, message) => ({ ok: false, code, message });

export const CODES = {
    NO_DISCORD: "NO_DISCORD",
    BRANCH_NOT_FOUND: "BRANCH_NOT_FOUND",
    DISCORD_RUNNING: "DISCORD_RUNNING",
    DISCORD_STILL_RUNNING: "DISCORD_STILL_RUNNING",
    ASAR_NOT_FOUND: "ASAR_NOT_FOUND",
    SOURCE_NOT_FOUND: "SOURCE_NOT_FOUND",
    VERIFY_SIZE: "VERIFY_SIZE",
    VERIFY_SHA: "VERIFY_SHA",
    NOT_INSTALLED: "NOT_INSTALLED",
    INTERNAL: "INTERNAL"
};
```

- [ ] **Step 2: `discord.mjs` yaz** (mevcut `scripts/installer/src/discord.mjs` temel alınır)

```js
/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/**
 * Discord kurulumlarını bulma ve süreç kontrolü.
 *
 * `%LocalAppData%` kullanıcı alanı — yönetici hakkı gerekmiyor.
 * Süreç çağrıları `run` üzerinden enjekte edilebilir (test için mock'lanır).
 */

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export const BRANCHES = [
    { id: "stable", name: "Discord", dir: "Discord", exe: "Discord.exe" },
    { id: "ptb", name: "Discord PTB", dir: "DiscordPTB", exe: "DiscordPTB.exe" },
    { id: "canary", name: "Discord Canary", dir: "DiscordCanary", exe: "DiscordCanary.exe" }
];

export function defaultRun(file, args) {
    return execFileSync(file, args, { encoding: "utf-8", windowsHide: true });
}

export function assertWindows(platform = process.platform) {
    if (platform !== "win32") {
        throw new Error(`MCord yalnızca Windows'u destekler. Bulunan platform: ${platform}`);
    }
}

/** Kurulu her dalın en yeni `app-*` klasörünü döndürür. */
export function discoverInstalls({ localAppData = process.env.LOCALAPPDATA } = {}) {
    if (!localAppData) throw new Error("%LOCALAPPDATA% tanımlı değil.");

    const found = [];

    for (const branch of BRANCHES) {
        const branchPath = join(localAppData, branch.dir);
        if (!existsSync(branchPath)) continue;

        const versions = readdirSync(branchPath)
            .filter(name => name.startsWith("app-"))
            .filter(name => safeIsDirectory(join(branchPath, name)))
            .sort(compareVersions);

        const latest = versions.at(-1);
        if (!latest) continue;

        const resources = join(branchPath, latest, "resources");
        if (!existsSync(resources)) continue;

        found.push({
            ...branch,
            version: latest,
            root: branchPath,
            resources,
            appAsar: join(resources, "app.asar"),
            backupAsar: join(resources, "_app.asar"),
            devAppDir: join(resources, "app"),
            executable: join(branchPath, branch.exe)
        });
    }

    return found;
}

export function isRunning(exeName, { run = defaultRun } = {}) {
    try {
        const output = run("tasklist", ["/FI", `IMAGENAME eq ${exeName}`]);
        return output.toLowerCase().includes(exeName.toLowerCase());
    } catch {
        return false;
    }
}

export function killDiscord(exeName, { run = defaultRun } = {}) {
    try {
        run("taskkill", ["/F", "/IM", exeName]);
        return true;
    } catch {
        return false;
    }
}

export function launchDiscord(executable, { run = defaultRun } = {}) {
    try {
        run("cmd", ["/c", "start", "", executable]);
        return true;
    } catch {
        return false;
    }
}

function safeIsDirectory(path) {
    try {
        return statSync(path).isDirectory();
    } catch {
        return false;
    }
}

/** `app-1.0.10` > `app-1.0.9` — sayısal parça parça. */
function compareVersions(a, b) {
    const pa = parseVersion(a);
    const pb = parseVersion(b);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
        if (diff !== 0) return diff;
    }
    return 0;
}

function parseVersion(dirName) {
    return dirName.slice("app-".length).split(".").map(part => Number.parseInt(part, 10) || 0);
}
```

- [ ] **Step 3: `install.mjs` yaz** — `node:fs`, `repair` eklenir

```js
/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/**
 * Kurulum ve kaldırma.
 *
 * **`node:fs` kullanılıyor.** `original-fs` yalnızca Electron içinde vardır;
 * standalone Node süreçte `fs` yamalanmamıştır, `app.asar` normal dosya gibi
 * görünür — `original-fs` hem yanlış hem gereksiz.
 */

import { createHash } from "node:crypto";
import { copyFileSync, existsSync, readFileSync, renameSync, rmSync, statSync } from "node:fs";

export function sha256(path) {
    return createHash("sha256").update(readFileSync(path)).digest("hex");
}

export function getStatus(install) {
    return {
        installed: existsSync(install.backupAsar),
        hasDevInjection: existsSync(install.devAppDir)
    };
}

/**
 * 1. `app.asar` → `_app.asar` (yedek yoksa)
 * 2. Bizim `app.asar`'ı kopyala
 * 3. Boyut + SHA-256 doğrula
 * Doğrulama başarısızsa `throw` (çağıran `Result`'a çevirir).
 */
export function installAsar(install, sourceAsar) {
    const { backupAsar, appAsar } = install;

    if (!existsSync(sourceAsar)) {
        const e = new Error(`Kaynak paket bulunamadı: ${sourceAsar}`);
        e.code = "SOURCE_NOT_FOUND";
        throw e;
    }
    if (!existsSync(appAsar) && !existsSync(backupAsar)) {
        const e = new Error(`Discord'un app.asar dosyası bulunamadı: ${appAsar}`);
        e.code = "ASAR_NOT_FOUND";
        throw e;
    }

    if (!existsSync(backupAsar)) {
        renameSync(appAsar, backupAsar);
    }
    copyFileSync(sourceAsar, appAsar);

    const expectedSize = statSync(sourceAsar).size;
    const actualSize = statSync(appAsar).size;
    if (expectedSize !== actualSize) {
        const e = new Error(`Boyut doğrulaması başarısız: ${actualSize} ≠ ${expectedSize}`);
        e.code = "VERIFY_SIZE";
        throw e;
    }

    const expectedHash = sha256(sourceAsar);
    const actualHash = sha256(appAsar);
    if (expectedHash !== actualHash) {
        const e = new Error(`SHA-256 doğrulaması başarısız:\n  beklenen ${expectedHash}\n  bulunan  ${actualHash}`);
        e.code = "VERIFY_SHA";
        throw e;
    }

    return { size: actualSize, sha256: actualHash };
}

/** `_app.asar` varsa geri adlandır, bizimkini sil; dev enjeksiyonu da temizle. */
export function uninstallAsar(install) {
    const { backupAsar, appAsar, devAppDir } = install;

    if (existsSync(devAppDir)) {
        rmSync(devAppDir, { recursive: true, force: true });
    }
    if (!existsSync(backupAsar)) {
        return { restored: false };
    }
    if (existsSync(appAsar)) {
        rmSync(appAsar, { force: true });
    }
    renameSync(backupAsar, appAsar);
    return { restored: true };
}
```

- [ ] **Step 4: `source.mjs` yaz**

```js
/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/** MCord'un `app.asar`'ını bul: exe yanında (pkg) veya repo `dist/` (kaynak). */

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

export function resolveSourceAsar(fromDir) {
    const candidates = [
        join(fromDir, "app.asar"),
        join(dirname(process.execPath), "app.asar"),
        // scripts/installer/src/{core|gui} → repo kökü → dist/
        join(fromDir, "..", "..", "..", "..", "dist", "app.asar"),
        join(fromDir, "..", "..", "..", "dist", "app.asar")
    ];
    for (const c of candidates) {
        if (existsSync(c)) return c;
    }
    const e = new Error("app.asar bulunamadı. Kaynaktan çalıştırıyorsan `pnpm dist` çalıştır.");
    e.code = "SOURCE_NOT_FOUND";
    throw e;
}
```

- [ ] **Step 5: `index.mjs` (dış API) yaz**

```js
/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/** GUI ve CLI'ın paylaştığı dış API. Hepsi Result döndürür, throw etmez. */

import { ok, err } from "./result.mjs";
import {
    assertWindows,
    discoverInstalls,
    isRunning,
    killDiscord,
    launchDiscord as launch
} from "./discord.mjs";
import { getStatus, installAsar, uninstallAsar } from "./install.mjs";

const sleep = ms => new Promise(r => setTimeout(r, ms));

function findInstall(branchId, deps) {
    const all = discoverInstalls(deps);
    if (!all.length) return { error: err("NO_DISCORD", "%LocalAppData% altında Discord kurulumu bulunamadı.") };
    const match = all.find(i => i.id === branchId);
    if (!match) return { error: err("BRANCH_NOT_FOUND", `"${branchId}" dalı kurulu değil.`) };
    return { install: match };
}

export function detectInstalls(deps = {}) {
    try {
        assertWindows();
        const all = discoverInstalls(deps);
        if (!all.length) return err("NO_DISCORD", "%LocalAppData% altında Discord kurulumu bulunamadı.");
        return ok(all.map(i => {
            const s = getStatus(i);
            return {
                id: i.id,
                name: i.name,
                version: i.version,
                installed: s.installed,
                hasDevInjection: s.hasDevInjection,
                running: isRunning(i.exe, deps)
            };
        }));
    } catch (e) {
        return err("INTERNAL", e.message);
    }
}

function doInstall(branchId, sourceAsar, onProgress, deps, { force }) {
    try {
        const { install, error } = findInstall(branchId, deps);
        if (error) return error;

        if (isRunning(install.exe, deps)) {
            return err("DISCORD_RUNNING", `${install.name} açık. app.asar kilitli.`);
        }

        const status = getStatus(install);
        if (status.installed && !force) {
            onProgress("Zaten kurulu, yeniden yazılıyor…");
        }

        onProgress("Yedekleniyor…");
        onProgress("Kopyalanıyor…");
        const result = installAsar(install, sourceAsar);
        onProgress(`Boyut doğrulandı — ${(result.size / 1024).toFixed(1)} KB`);
        onProgress(`SHA-256 doğrulandı — ${result.sha256.slice(0, 16)}…`);
        return ok(result);
    } catch (e) {
        return err(e.code ?? "INTERNAL", e.message);
    }
}

export function install(branchId, sourceAsar, onProgress = () => {}, deps = {}) {
    return doInstall(branchId, sourceAsar, onProgress, deps, { force: false });
}

export function repair(branchId, sourceAsar, onProgress = () => {}, deps = {}) {
    return doInstall(branchId, sourceAsar, onProgress, deps, { force: true });
}

export function uninstall(branchId, onProgress = () => {}, deps = {}) {
    try {
        const { install: target, error } = findInstall(branchId, deps);
        if (error) return error;

        if (isRunning(target.exe, deps)) {
            return err("DISCORD_RUNNING", `${target.name} açık. app.asar kilitli.`);
        }

        const status = getStatus(target);
        if (!status.installed && !status.hasDevInjection) {
            return err("NOT_INSTALLED", "MCord kurulu değil.");
        }

        onProgress("Kaldırılıyor…");
        const result = uninstallAsar(target);
        onProgress(result.restored ? "Orijinal app.asar geri yüklendi." : "Temizlendi.");
        return ok(result);
    } catch (e) {
        return err(e.code ?? "INTERNAL", e.message);
    }
}

export function closeDiscord(branchId, deps = {}) {
    try {
        const { install: target, error } = findInstall(branchId, deps);
        if (error) return error;
        if (!isRunning(target.exe, deps)) return ok({});

        killDiscord(target.exe, deps);
        return waitClosed(target, deps);
    } catch (e) {
        return err(e.code ?? "INTERNAL", e.message);
    }
}

async function waitClosed(target, deps) {
    for (let i = 0; i < 20; i++) {
        if (!isRunning(target.exe, deps)) return ok({});
        await sleep(250);
    }
    return err("DISCORD_STILL_RUNNING", "Discord kapanmadı.");
}

export function launchDiscord(branchId, deps = {}) {
    try {
        const { install: target, error } = findInstall(branchId, deps);
        if (error) return error;
        launch(target.executable, deps);
        return ok({});
    } catch (e) {
        return err(e.code ?? "INTERNAL", e.message);
    }
}
```

> Not: `closeDiscord`/`waitClosed` `async` döndürebilir (Promise<Result>). `webview.expose` zaten Promise'i destekliyor; CLI `await` ediyor.

- [ ] **Step 6: `vitest.config.ts` include'unu genişlet**

`vitest.config.ts` içinde:
```ts
        include: ["src/**/*.test.ts", "scripts/installer/src/**/*.test.mjs"],
```

- [ ] **Step 7: Başarısız testleri yaz — `discord.test.mjs`**

```js
/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { discoverInstalls, isRunning } from "./discord.mjs";

let root;

beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "mcord-inst-"));
});
afterEach(() => {
    rmSync(root, { recursive: true, force: true });
});

function makeBranch(dir, versions) {
    for (const v of versions) {
        mkdirSync(join(root, dir, `app-${v}`, "resources"), { recursive: true });
    }
}

describe("discoverInstalls", () => {
    it("Discord yoksa boş dizi döner", () => {
        expect(discoverInstalls({ localAppData: root })).toEqual([]);
    });

    it("her dalın en yeni sürümünü seçer (sayısal karşılaştırma)", () => {
        makeBranch("Discord", ["1.0.9", "1.0.10", "1.0.2"]);
        const found = discoverInstalls({ localAppData: root });
        expect(found).toHaveLength(1);
        expect(found[0].id).toBe("stable");
        expect(found[0].version).toBe("app-1.0.10");
    });

    it("birden fazla dalı ayrı ayrı bulur", () => {
        makeBranch("Discord", ["1.0.1"]);
        makeBranch("DiscordCanary", ["1.0.5"]);
        const ids = discoverInstalls({ localAppData: root }).map(i => i.id).sort();
        expect(ids).toEqual(["canary", "stable"]);
    });
});

describe("isRunning", () => {
    it("tasklist çıktısında exe adı varsa true", () => {
        const run = () => "Discord.exe   1234 Console   1   120,000 K";
        expect(isRunning("Discord.exe", { run })).toBe(true);
    });
    it("çıktı boşsa false", () => {
        const run = () => "INFO: No tasks are running.";
        expect(isRunning("Discord.exe", { run })).toBe(false);
    });
    it("run patlarsa false", () => {
        const run = () => { throw new Error("boom"); };
        expect(isRunning("Discord.exe", { run })).toBe(false);
    });
});
```

- [ ] **Step 8: Testi çalıştır — başarısız olduğunu gör**

Run: `pnpm test -- scripts/installer/src/core/discord.test.mjs`
Expected: FAIL — `Cannot find module './discord.mjs'` (henüz Step 2–3'te yazıldıysa PASS olabilir; bu durumda Step 2–3 kodunu bu adımdan önce eklemiş olduğunu doğrula ve devam et).

- [ ] **Step 9: `install.test.mjs` yaz**

```js
/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getStatus, installAsar, uninstallAsar } from "./install.mjs";

let root;
let install;

beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "mcord-asar-"));
    const resources = join(root, "resources");
    mkdirSync(resources, { recursive: true });
    install = {
        appAsar: join(resources, "app.asar"),
        backupAsar: join(resources, "_app.asar"),
        devAppDir: join(resources, "app")
    };
    writeFileSync(install.appAsar, "ORIJINAL DISCORD");
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

function source(content = "MCORD PAKETI") {
    const p = join(root, "src-app.asar");
    writeFileSync(p, content);
    return p;
}

describe("installAsar", () => {
    it("yedek oluşturur ve bizim asar'ı kopyalar", () => {
        const res = installAsar(install, source("MCORD"));
        expect(readFileSync(install.appAsar, "utf-8")).toBe("MCORD");
        expect(readFileSync(install.backupAsar, "utf-8")).toBe("ORIJINAL DISCORD");
        expect(res.size).toBe(5);
    });

    it("idempotent — ikinci çağrı yedeği bozmaz", () => {
        installAsar(install, source("MCORD-1"));
        installAsar(install, source("MCORD-2"));
        expect(readFileSync(install.appAsar, "utf-8")).toBe("MCORD-2");
        expect(readFileSync(install.backupAsar, "utf-8")).toBe("ORIJINAL DISCORD");
    });

    it("kaynak yoksa SOURCE_NOT_FOUND koduyla patlar", () => {
        expect(() => installAsar(install, join(root, "yok.asar")))
            .toThrowError(expect.objectContaining({ code: "SOURCE_NOT_FOUND" }));
    });
});

describe("uninstallAsar", () => {
    it("yedeği geri yükler", () => {
        installAsar(install, source("MCORD"));
        const res = uninstallAsar(install);
        expect(res.restored).toBe(true);
        expect(readFileSync(install.appAsar, "utf-8")).toBe("ORIJINAL DISCORD");
    });

    it("dev enjeksiyon klasörünü temizler", () => {
        mkdirSync(install.devAppDir, { recursive: true });
        writeFileSync(join(install.devAppDir, "patcher.js"), "x");
        uninstallAsar(install);
        expect(getStatus(install).hasDevInjection).toBe(false);
    });

    it("kurulu değilse restored:false", () => {
        expect(uninstallAsar(install).restored).toBe(false);
    });
});
```

- [ ] **Step 10: `index.test.mjs` yaz**

```js
/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { detectInstalls, install, uninstall } from "./index.mjs";

let root;
let deps;

beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "mcord-api-"));
    mkdirSync(join(root, "Discord", "app-1.0.0", "resources"), { recursive: true });
    writeFileSync(join(root, "Discord", "app-1.0.0", "resources", "app.asar"), "ORIJINAL");
    deps = { localAppData: root, run: () => "INFO: No tasks are running." };
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe("detectInstalls", () => {
    it("Discord yoksa NO_DISCORD", () => {
        const res = detectInstalls({ localAppData: join(root, "yok"), run: deps.run });
        expect(res).toMatchObject({ ok: false, code: "NO_DISCORD" });
    });
    it("kurulu dalı durumuyla döner", () => {
        const res = detectInstalls(deps);
        expect(res.ok).toBe(true);
        expect(res.data[0]).toMatchObject({ id: "stable", installed: false, running: false });
    });
});

describe("install", () => {
    it("geçerli dalda kurar ve doğrular", () => {
        const src = join(root, "mcord.asar");
        writeFileSync(src, "MCORD");
        const res = install("stable", src, () => {}, deps);
        expect(res).toMatchObject({ ok: true });
        expect(res.data.size).toBe(5);
    });
    it("Discord açıksa DISCORD_RUNNING", () => {
        const src = join(root, "mcord.asar");
        writeFileSync(src, "MCORD");
        const running = { ...deps, run: () => "Discord.exe 1 Console 1 1 K" };
        expect(install("stable", src, () => {}, running)).toMatchObject({ ok: false, code: "DISCORD_RUNNING" });
    });
    it("bilinmeyen dal BRANCH_NOT_FOUND", () => {
        expect(install("ptb", "x", () => {}, deps)).toMatchObject({ ok: false, code: "BRANCH_NOT_FOUND" });
    });
});

describe("uninstall", () => {
    it("kurulu değilse NOT_INSTALLED", () => {
        expect(uninstall("stable", () => {}, deps)).toMatchObject({ ok: false, code: "NOT_INSTALLED" });
    });
});
```

- [ ] **Step 11: Tüm çekirdek testlerini çalıştır — geçtiğini gör**

Run: `pnpm test -- scripts/installer`
Expected: PASS — 3 dosya, ~15+ test yeşil.

- [ ] **Step 12: Lint + commit**

Run: `pnpm lint`
Expected: temiz (yeni `.mjs` dosyaları header + import sort kurallarına uyuyor).

```bash
git add scripts/installer/src/core vitest.config.ts
git commit -m "installer: UI'dan bağımsız çekirdek mantık + birim testleri"
```

---

## Task 2: CLI modu + dispatcher

**Files:**
- Create: `scripts/installer/src/cli.mjs`
- Create: `scripts/installer/src/index.mjs`
- Delete: `scripts/installer/src/discord.mjs`, `scripts/installer/src/install.mjs`
- Modify: `scripts/installer/package.json` (`bin`/`scripts.start` yolları zaten `src/index.mjs`)

**Interfaces:**
- Consumes: `core/index.mjs` (`detectInstalls, install, uninstall, repair, closeDiscord, launchDiscord`), `core/source.mjs` (`resolveSourceAsar`)
- Produces:
  - `cli.mjs`: `export async function runCli(argv = process.argv.slice(2)): Promise<void>` — çıkışta `process.exitCode` ayarlar
  - `index.mjs`: giriş noktası; `--`/`-y` argümanı varsa `runCli`, yoksa `../gui/main.mjs` dinamik import

- [ ] **Step 1: `cli.mjs` yaz** (mevcut `src/index.mjs` akışı, core API'siyle)

```js
/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/**
 * Başsız / etkileşimli kurulum:
 *   MCordInstaller.exe --branch=stable --yes
 *   MCordInstaller.exe --uninstall
 */

import { dirname, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

import { resolveSourceAsar } from "./core/source.mjs";
import {
    closeDiscord,
    detectInstalls,
    install,
    launchDiscord,
    repair,
    uninstall
} from "./core/index.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

export async function runCli(argv = process.argv.slice(2)) {
    const UNINSTALL = argv.includes("--uninstall");
    const REPAIR = argv.includes("--repair");
    const YES = argv.includes("--yes") || argv.includes("-y");
    const branchArg = argv.find(a => a.startsWith("--branch="))?.split("=")[1];

    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const ask = async q => (YES ? "" : (await rl.question(q)).trim());
    const confirm = async q => (YES ? true : (await ask(`${q} [E/h] `)).toLowerCase() !== "h");

    try {
        console.log("MCord kurulum aracı\n");
        console.log("MCord bir istemci modudur ve Discord'un Kullanım Şartları'na aykırıdır.\n");

        const detected = detectInstalls();
        if (!detected.ok) throw new Error(detected.message);

        let targets = detected.data;
        if (branchArg) {
            targets = targets.filter(t => t.id === branchArg);
            if (!targets.length) throw new Error(`"${branchArg}" dalı kurulu değil.`);
        } else if (targets.length > 1 && !YES) {
            targets.forEach((t, i) => console.log(`  ${i + 1}) ${t.name} — ${t.version}${t.installed ? "  [MCord kurulu]" : ""}`));
            console.log(`  ${targets.length + 1}) Hepsi\n`);
            const choice = Number.parseInt(await ask("Seçim (numara): "), 10);
            if (choice >= 1 && choice <= targets.length) targets = [targets[choice - 1]];
            else if (choice !== targets.length + 1) throw new Error("Geçersiz seçim.");
        }

        const source = UNINSTALL ? null : resolveSourceAsar(join(HERE, "core"));

        for (const target of targets) {
            const label = UNINSTALL ? "kaldırılıyor" : REPAIR ? "onarılıyor" : "kuruluyor";
            console.log(`\n${target.name} ${target.version} — ${label}…`);

            let res = UNINSTALL
                ? uninstall(target.id, log)
                : (REPAIR ? repair : install)(target.id, source, log);

            if (!res.ok && res.code === "DISCORD_RUNNING") {
                if (await confirm("  Discord açık. Kapatayım mı?")) {
                    const closed = await closeDiscord(target.id);
                    if (!closed.ok) { console.log(`  ✘ ${closed.message}`); continue; }
                    res = UNINSTALL ? uninstall(target.id, log) : (REPAIR ? repair : install)(target.id, source, log);
                } else {
                    console.log("  atlandı."); continue;
                }
            }

            if (!res.ok) { console.log(`  ✘ [${res.code}] ${res.message}`); process.exitCode = 1; continue; }

            if (!UNINSTALL) {
                console.log(`  ✔ ${(res.data.size / 1024).toFixed(1)} KB — sha256 ${res.data.sha256}`);
                if (await confirm("  Discord'u başlatayım mı?")) launchDiscord(target.id);
            } else {
                console.log(res.data.restored ? "  ✔ Orijinal app.asar geri yüklendi." : "  ✔ Temizlendi.");
            }
        }

        console.log("\n✔ Bitti.");
    } catch (e) {
        console.error(`\n✘ ${e.message}`);
        process.exitCode = 1;
    } finally {
        rl.close();
    }

    function log(line) { console.log(`  · ${line}`); }
}
```

- [ ] **Step 2: `index.mjs` (dispatcher) yaz**

```js
/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/** Argüman varsa CLI, yoksa pencere. */

const argv = process.argv.slice(2);
const wantsCli = argv.some(a => a.startsWith("-"));

if (wantsCli) {
    const { runCli } = await import("./cli.mjs");
    await runCli(argv);
} else {
    await import("./gui/main.mjs");
}
```

- [ ] **Step 3: Eski dosyaları sil**

```bash
git rm scripts/installer/src/discord.mjs scripts/installer/src/install.mjs
```

- [ ] **Step 4: CLI'ı elle dene (Discord yokken)**

Run: `node scripts/installer/src/index.mjs --branch=stable --yes`
Expected: `✘ ...Discord kurulumu bulunamadı.` yazar, `echo $?` / `$LASTEXITCODE` = 1.
(Windows'ta Discord kuruluysa: gerçek kurulum yapar — sanal makinede veya Discord'suz ortamda çalıştır.)

- [ ] **Step 5: Lint + typecheck + commit**

Run: `pnpm lint && pnpm test -- scripts/installer`
Expected: temiz + testler hâlâ yeşil.

```bash
git add scripts/installer/src
git commit -m "installer: CLI modu çekirdek API'sine taşındı + dispatcher"
```

---

## Task 3: React UI (durum makinesi) + esbuild bundle

**Files:**
- Create: `scripts/installer/tsconfig.json`
- Modify: `tsconfig.json` (kök — `exclude`)
- Modify: `package.json` (kök — `typecheck`)
- Modify: `scripts/installer/package.json` (deps + `build` script)
- Create: `scripts/installer/build.mjs`
- Create: `scripts/installer/src/gui/ui/index.html`
- Create: `scripts/installer/src/gui/ui/main.tsx`
- Create: `scripts/installer/src/gui/ui/App.tsx`
- Create: `scripts/installer/src/gui/ui/theme.css`
- Create: `scripts/installer/src/gui/ui/api.ts`
- Create: `scripts/installer/src/gui/ui/messages.mjs`
- Create: `scripts/installer/src/gui/ui/messages.test.mjs`
- Create: `scripts/installer/src/gui/ui/components/BranchList.tsx`
- Create: `scripts/installer/src/gui/ui/components/ActionBar.tsx`
- Create: `scripts/installer/src/gui/ui/components/ProgressLog.tsx`
- Create: `scripts/installer/src/gui/ui/components/ResultScreen.tsx`

**Interfaces:**
- Consumes: (runtime) `window.core` — `webview.expose` ile Task 4'te sağlanır; `window.__mcordProgress` callback
- Produces:
  - `messages.mjs`: `export function errorText(code: string): string`
  - `build.mjs`: `node build.mjs` → `scripts/installer/dist-ui/index.html` (JS + CSS gömülü tek dosya)
  - `api.ts`: `export type BranchStatus`, `export type Result<T>`, `export const core` (window.core tipli sarmalayıcı), `export function onProgress(cb)`

- [ ] **Step 1: `scripts/installer/package.json` — deps + build script**

```json
{
    "name": "mcord-installer",
    "private": true,
    "version": "0.1.0",
    "description": "MCord installer for Windows",
    "license": "PolyForm-Strict-1.0.0",
    "type": "module",
    "bin": { "mcord-installer": "src/index.mjs" },
    "scripts": {
        "start": "node src/index.mjs",
        "build": "node build.mjs",
        "typecheck": "tsc --noEmit -p tsconfig.json",
        "package": "node build.mjs && pkg . --output ../../dist/MCordInstaller.exe"
    },
    "dependencies": {
        "@webviewjs/webview": "0.4.4",
        "react": "19.1.1",
        "react-dom": "19.1.1"
    },
    "devDependencies": {
        "@yao-pkg/pkg": "^6.9.0",
        "esbuild": "^0.25.10"
    },
    "pkg": {
        "scripts": ["src/**/*.mjs"],
        "assets": [
            "dist-ui/index.html",
            "../../dist/app.asar",
            "node_modules/@webviewjs/webview-*/**"
        ],
        "targets": ["node22-win-x64"],
        "outputPath": "../../dist"
    }
}
```

> `@webviewjs/webview` sürümünü kur anında `npm view @webviewjs/webview version` ile doğrula ve en güncel 0.x'i sabitle. React sürümünü kök `@types/react` (19.1.x) ile hizala.

- [ ] **Step 2: `scripts/installer/tsconfig.json` yaz**

```json
{
    "compilerOptions": {
        "target": "ESNext",
        "module": "ESNext",
        "moduleResolution": "bundler",
        "lib": ["DOM", "DOM.Iterable", "ESNext"],
        "strict": true,
        "jsx": "react-jsx",
        "jsxImportSource": "react",
        "allowJs": true,
        "checkJs": false,
        "noEmit": true,
        "skipLibCheck": true,
        "types": ["react", "react-dom"]
    },
    "include": ["src/gui/ui/**/*"]
}
```

- [ ] **Step 3: Kök `tsconfig.json` — installer'ı hariç tut**

Kök `tsconfig.json` `exclude` dizisini şu hale getir:
```json
    "exclude": ["node_modules", "dist", "scripts/installer"]
```

- [ ] **Step 4: Kök `package.json` — `typecheck` her iki projeyi kapsasın**

```json
        "typecheck": "tsc --noEmit && pnpm --filter mcord-installer typecheck",
```

- [ ] **Step 5: `messages.mjs` + başarısız testi**

`src/gui/ui/messages.mjs`:
```js
/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

const TEXT = {
    NO_DISCORD: "Bilgisayarında Discord kurulumu bulunamadı.",
    BRANCH_NOT_FOUND: "Seçilen Discord dalı artık kurulu değil.",
    DISCORD_RUNNING: "Discord açık — devam etmeden önce kapatılmalı.",
    DISCORD_STILL_RUNNING: "Discord kapatılamadı. Elle kapatıp tekrar dene.",
    ASAR_NOT_FOUND: "Discord'un app.asar dosyası bulunamadı. Discord'u onar.",
    SOURCE_NOT_FOUND: "MCord paketi (app.asar) bulunamadı.",
    VERIFY_SIZE: "Kopyalama doğrulanamadı (boyut). Discord'u açma, tekrar dene.",
    VERIFY_SHA: "Kopyalama doğrulanamadı (SHA-256). Discord'u açma, tekrar dene.",
    NOT_INSTALLED: "MCord bu dalda kurulu değil.",
    INTERNAL: "Beklenmeyen bir hata oluştu."
};

export function errorText(code) {
    return TEXT[code] ?? TEXT.INTERNAL;
}
```

`src/gui/ui/messages.test.mjs`:
```js
/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { describe, expect, it } from "vitest";

import { errorText } from "./messages.mjs";

describe("errorText", () => {
    it("bilinen kodu insanca metne çevirir", () => {
        expect(errorText("DISCORD_RUNNING")).toMatch(/Discord açık/);
    });
    it("bilinmeyen kod için genel mesaj döner", () => {
        expect(errorText("WAT")).toBe(errorText("INTERNAL"));
    });
});
```

- [ ] **Step 6: Testi çalıştır — başarısız**

Run: `pnpm test -- scripts/installer/src/gui/ui/messages.test.mjs`
Expected: FAIL — `Cannot find module './messages.mjs'` (Step 5 kodu eklendikten sonra PASS).

- [ ] **Step 7: `api.ts` yaz**

```ts
/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

export type BranchStatus = {
    id: "stable" | "ptb" | "canary";
    name: string;
    version: string;
    installed: boolean;
    hasDevInjection: boolean;
    running: boolean;
};

export type Result<T> = { ok: true; data: T } | { ok: false; code: string; message: string };

type Core = {
    detectInstalls(): Promise<Result<BranchStatus[]>>;
    install(id: string): Promise<Result<{ size: number; sha256: string }>>;
    uninstall(id: string): Promise<Result<{ restored: boolean }>>;
    repair(id: string): Promise<Result<{ size: number; sha256: string }>>;
    closeDiscord(id: string): Promise<Result<Record<string, never>>>;
    launchDiscord(id: string): Promise<Result<Record<string, never>>>;
};

declare global {
    interface Window {
        core: Core;
        __mcordProgress?: (line: string) => void;
    }
}

// Lazy: `webview.expose` window.core'u sayfa yüklendikten sonra kurabilir,
// bu yüzden modül yükleme anında değil, çağrı anında oku.
export const core: Core = new Proxy({} as Core, {
    get: (_t, prop: string) => (...args: unknown[]) => {
        const fn = (window.core as unknown as Record<string, (...a: unknown[]) => unknown>)[prop];
        if (typeof fn !== "function") return Promise.reject(new Error(`core.${prop} yok`));
        return fn(...args);
    }
});

export function onProgress(cb: (line: string) => void): void {
    window.__mcordProgress = cb;
}
```

> `webview.expose("core", …)` çağrısını `main.mjs`'te `createWebview`'dan **önce**
> yapmayı dene; kütüphane init-script olarak enjekte ediyorsa sıra önemsiz, ama
> erken kayıt yarış durumunu tümden eler. README örneği sonra çağırıyor — kur
> anındaki davranışı `evaluateScript` testiyle doğrula.

- [ ] **Step 8: `theme.css` yaz**

```css
/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

:root {
    --bg: #313338;
    --bg-alt: #2b2d31;
    --card: #383a40;
    --text: #f2f3f5;
    --text-muted: #b5bac1;
    --accent: #5865f2;
    --accent-hover: #4752c4;
    --danger: #da373c;
    --ok: #23a55a;
    --border: #1e1f22;
}

* { box-sizing: border-box; margin: 0; }

body {
    background: var(--bg);
    color: var(--text);
    font: 14px/1.45 "gg sans", "Segoe UI", system-ui, sans-serif;
    padding: 20px;
    user-select: none;
    -webkit-user-select: none;
}

h1 { font-size: 18px; margin-bottom: 4px; }
p.sub { color: var(--text-muted); margin-bottom: 16px; font-size: 12px; }

button {
    font: inherit;
    border: 0;
    border-radius: 4px;
    padding: 10px 16px;
    cursor: pointer;
    color: #fff;
    background: var(--accent);
}
button:hover { background: var(--accent-hover); }
button:disabled { opacity: .5; cursor: default; }
button.secondary { background: var(--card); }
button.danger { background: var(--danger); }

.branch {
    display: flex;
    align-items: center;
    gap: 10px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 10px 12px;
    margin-bottom: 8px;
    cursor: pointer;
}
.branch.selected { border-color: var(--accent); }
.branch .meta { flex: 1; }
.branch .badge { font-size: 11px; color: var(--text-muted); }
.branch .badge.ok { color: var(--ok); }

.actions { display: flex; gap: 8px; margin-top: 12px; }

.log {
    background: var(--bg-alt);
    border-radius: 6px;
    padding: 10px;
    font-family: "Consolas", monospace;
    font-size: 12px;
    height: 220px;
    overflow-y: auto;
    white-space: pre-wrap;
}

.center { text-align: center; padding-top: 40px; }
.center .icon { font-size: 40px; }
.center.ok .icon { color: var(--ok); }
.center.err .icon { color: var(--danger); }
.hash { font-family: monospace; font-size: 11px; color: var(--text-muted); word-break: break-all; margin-top: 8px; }
```

- [ ] **Step 9: Bileşenler**

`components/BranchList.tsx`:
```tsx
/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import type { BranchStatus } from "../api";

type Props = {
    branches: BranchStatus[];
    selected: string | null;
    onSelect: (id: string) => void;
};

export function BranchList({ branches, selected, onSelect }: Props) {
    return (
        <div>
            {branches.map(b => (
                <div
                    key={b.id}
                    className={`branch${selected === b.id ? " selected" : ""}`}
                    onClick={() => onSelect(b.id)}
                >
                    <div className="meta">
                        <div>{b.name}</div>
                        <div className="badge">{b.version.replace("app-", "v")}</div>
                    </div>
                    <div className={`badge${b.installed ? " ok" : ""}`}>
                        {b.installed ? "MCord kurulu" : b.hasDevInjection ? "dev enjeksiyon" : "kurulu değil"}
                        {b.running ? " · açık" : ""}
                    </div>
                </div>
            ))}
        </div>
    );
}
```

`components/ActionBar.tsx`:
```tsx
/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

type Props = {
    disabled: boolean;
    installed: boolean;
    onInstall: () => void;
    onRepair: () => void;
    onUninstall: () => void;
};

export function ActionBar({ disabled, installed, onInstall, onRepair, onUninstall }: Props) {
    return (
        <div className="actions">
            <button disabled={disabled} onClick={onInstall}>{installed ? "Yeniden Kur" : "Kur"}</button>
            {installed && <button className="secondary" disabled={disabled} onClick={onRepair}>Onar</button>}
            {installed && <button className="danger" disabled={disabled} onClick={onUninstall}>Kaldır</button>}
        </div>
    );
}
```

`components/ProgressLog.tsx`:
```tsx
/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { useEffect, useRef } from "react";

export function ProgressLog({ lines }: { lines: string[] }) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
    }, [lines]);
    return <div className="log" ref={ref}>{lines.join("\n")}</div>;
}
```

`components/ResultScreen.tsx`:
```tsx
/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

type Props = {
    kind: "ok" | "err";
    title: string;
    detail?: string;
    hash?: string;
    primaryLabel: string;
    onPrimary: () => void;
    onClose: () => void;
};

export function ResultScreen({ kind, title, detail, hash, primaryLabel, onPrimary, onClose }: Props) {
    return (
        <div className={`center ${kind}`}>
            <div className="icon">{kind === "ok" ? "✔" : "✘"}</div>
            <h1>{title}</h1>
            {detail && <p className="sub">{detail}</p>}
            {hash && <div className="hash">sha256: {hash}</div>}
            <div className="actions" style={{ justifyContent: "center", marginTop: 20 }}>
                <button onClick={onPrimary}>{primaryLabel}</button>
                <button className="secondary" onClick={onClose}>Kapat</button>
            </div>
        </div>
    );
}
```

- [ ] **Step 10: `App.tsx` — durum makinesi**

```tsx
/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { useEffect, useState } from "react";

import { BranchStatus, core, onProgress, Result } from "./api";
import { ActionBar } from "./components/ActionBar";
import { BranchList } from "./components/BranchList";
import { ProgressLog } from "./components/ProgressLog";
import { ResultScreen } from "./components/ResultScreen";
import { errorText } from "./messages.mjs";

type Screen =
    | { name: "loading" }
    | { name: "no-discord" }
    | { name: "pick"; branches: BranchStatus[]; selected: string | null }
    | { name: "working"; lines: string[] }
    | { name: "done"; branchId: string; size: number; sha256: string; action: string }
    | { name: "error"; code: string; retry: (() => void) | null };

export function App() {
    const [screen, setScreen] = useState<Screen>({ name: "loading" });

    async function refresh() {
        setScreen({ name: "loading" });
        const res = await core.detectInstalls();
        if (!res.ok) {
            setScreen(res.code === "NO_DISCORD" ? { name: "no-discord" } : { name: "error", code: res.code, retry: refresh });
            return;
        }
        setScreen({ name: "pick", branches: res.data, selected: res.data[0]?.id ?? null });
    }

    useEffect(() => { void refresh(); }, []);

    async function run(
        branchId: string,
        action: "install" | "repair" | "uninstall",
        label: string
    ) {
        const lines: string[] = [];
        setScreen({ name: "working", lines });
        onProgress(line => {
            lines.push(`· ${line}`);
            setScreen({ name: "working", lines: [...lines] });
        });

        let res: Result<{ size?: number; sha256?: string; restored?: boolean }> =
            action === "install" ? await core.install(branchId)
            : action === "repair" ? await core.repair(branchId)
            : await core.uninstall(branchId);

        if (!res.ok && res.code === "DISCORD_RUNNING") {
            lines.push("· Discord kapatılıyor…");
            setScreen({ name: "working", lines: [...lines] });
            const closed = await core.closeDiscord(branchId);
            if (!closed.ok) { setScreen({ name: "error", code: closed.code, retry: () => run(branchId, action, label) }); return; }
            res = action === "install" ? await core.install(branchId)
                : action === "repair" ? await core.repair(branchId)
                : await core.uninstall(branchId);
        }

        if (!res.ok) {
            setScreen({ name: "error", code: res.code, retry: () => run(branchId, action, label) });
            return;
        }

        if (action === "uninstall") { await refresh(); return; }
        setScreen({ name: "done", branchId, size: res.data.size!, sha256: res.data.sha256!, action: label });
    }

    switch (screen.name) {
        case "loading":
            return <div className="center"><p className="sub">Discord kurulumları taranıyor…</p></div>;

        case "no-discord":
            return (
                <ResultScreen
                    kind="err" title="Discord bulunamadı"
                    detail={errorText("NO_DISCORD")}
                    primaryLabel="Tekrar tara" onPrimary={refresh} onClose={() => core.launchDiscord("stable")}
                />
            );

        case "pick": {
            const sel = screen.branches.find(b => b.id === screen.selected);
            return (
                <div>
                    <h1>MCord Kurulum</h1>
                    <p className="sub">MCord bir istemci modudur ve Discord'un Kullanım Şartları'na aykırıdır.</p>
                    <BranchList
                        branches={screen.branches}
                        selected={screen.selected}
                        onSelect={id => setScreen({ ...screen, selected: id })}
                    />
                    {sel && (
                        <ActionBar
                            disabled={!screen.selected}
                            installed={sel.installed}
                            onInstall={() => run(sel.id, "install", "Kuruldu")}
                            onRepair={() => run(sel.id, "repair", "Onarıldı")}
                            onUninstall={() => run(sel.id, "uninstall", "Kaldırıldı")}
                        />
                    )}
                </div>
            );
        }

        case "working":
            return (
                <div>
                    <h1>İşlem sürüyor…</h1>
                    <p className="sub">Bu pencereyi kapatma.</p>
                    <ProgressLog lines={screen.lines} />
                </div>
            );

        case "done":
            return (
                <ResultScreen
                    kind="ok" title={screen.action}
                    detail={`${(screen.size / 1024).toFixed(1)} KB`}
                    hash={screen.sha256}
                    primaryLabel="Discord'u başlat"
                    onPrimary={() => core.launchDiscord(screen.branchId)}
                    onClose={refresh}
                />
            );

        case "error":
            return (
                <ResultScreen
                    kind="err" title="Hata"
                    detail={errorText(screen.code)}
                    primaryLabel={screen.retry ? "Tekrar dene" : "Kapat"}
                    onPrimary={screen.retry ?? refresh}
                    onClose={refresh}
                />
            );
    }
}
```

- [ ] **Step 11: `main.tsx` + `index.html`**

`main.tsx`:
```tsx
/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { createRoot } from "react-dom/client";

import { App } from "./App";
import "./theme.css";

createRoot(document.getElementById("root")!).render(<App />);
```

`index.html`:
```html
<!doctype html>
<html lang="tr">
<head><meta charset="utf-8"><title>MCord Kurulum</title>__STYLE__</head>
<body><div id="root"></div>__SCRIPT__</body>
</html>
```

- [ ] **Step 12: `build.mjs` — esbuild → tek dosya**

```js
/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/** src/gui/ui → dist-ui/index.html (JS + CSS gömülü, harici istek yok). */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

const HERE = dirname(fileURLToPath(import.meta.url));
const UI = join(HERE, "src", "gui", "ui");
const OUT = join(HERE, "dist-ui");

mkdirSync(OUT, { recursive: true });

const result = await build({
    entryPoints: [join(UI, "main.tsx")],
    bundle: true,
    minify: true,
    format: "iife",
    target: ["chrome110"],
    jsx: "automatic",
    loader: { ".css": "text" },
    write: false,
    metafile: false,
    logLevel: "info"
});

// esbuild css loader'ı "text" verince CSS import'u string döner; theme.css'i
// ayrıca doğrudan okuyup <style>'a gömüyoruz (main.tsx'teki import yalnızca
// bundler'ı memnun etmek için; runtime'da no-op).
const css = readFileSync(join(UI, "theme.css"), "utf-8");
const js = result.outputFiles[0].text;

const html = readFileSync(join(UI, "index.html"), "utf-8")
    .replace("__STYLE__", `<style>${css}</style>`)
    .replace("__SCRIPT__", `<script>${js}</script>`);

writeFileSync(join(OUT, "index.html"), html);
console.log(`[MCord] UI paketlendi — ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB`);
```

> `main.tsx` içindeki `import "./theme.css"` esbuild'de `.css` loader'ı `text` olduğu için bir string modülüne çözülür ve kullanılmadığı için tree-shake edilir; CSS gerçekte `build.mjs`'in `readFileSync`'iyle gömülür. Alternatif: `import "./theme.css"` satırını sil ve loader'ı kaldır — bundle daha temiz. Uygulayan bunu tercih edebilir.

- [ ] **Step 13: install + build + test + typecheck**

Run:
```bash
pnpm install
pnpm --filter mcord-installer build
pnpm --filter mcord-installer typecheck
pnpm test -- scripts/installer
```
Expected: `dist-ui/index.html` oluşur (~150–300 KB); typecheck temiz; testler yeşil.

- [ ] **Step 14: Lint + commit**

Run: `pnpm lint`
Expected: temiz.

```bash
git add scripts/installer tsconfig.json package.json
git commit -m "installer: React tabanlı pencere arayüzü (esbuild ile tek HTML)"
```

---

## Task 4: GUI ana süreç — webview + core köprüsü

**Files:**
- Create: `scripts/installer/src/gui/main.mjs`
- Modify: `scripts/installer/src/gui/ui/index.html` (yalnızca gerekiyorsa; genelde değişmez)

**Interfaces:**
- Consumes: `core/index.mjs` API, `core/source.mjs` `resolveSourceAsar`, `@webviewjs/webview` (`Application`), `dist-ui/index.html` (Task 3 çıktısı — pkg'de asset, kaynakta dosya)
- Produces: çalışan pencere; `window.core.*` (Promise<Result>), `window.__mcordProgress` beslemesi

- [ ] **Step 1: `main.mjs` yaz**

```js
/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/**
 * Pencere süreci. Core'u `webview.expose("core", …)` ile açar; ilerleme
 * satırlarını `webview.evaluateScript` ile UI'a iter.
 *
 * UI, esbuild'in ürettiği tek `dist-ui/index.html` — `mcord://` özel
 * protokolüyle servis edilir (data: URI boyut sınırından kaçınmak için).
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { Application } from "@webviewjs/webview";

import {
    closeDiscord,
    detectInstalls,
    install as coreInstall,
    launchDiscord,
    repair as coreRepair,
    uninstall as coreUninstall
} from "../core/index.mjs";
import { resolveSourceAsar } from "../core/source.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

function loadUiHtml() {
    // pkg: asset exe içinde, execPath'e göre çözülür; kaynak: dist-ui/ yanında
    const candidates = [
        join(HERE, "..", "..", "dist-ui", "index.html"),
        join(dirname(process.execPath), "dist-ui", "index.html")
    ];
    for (const c of candidates) {
        if (existsSync(c)) return readFileSync(c, "utf-8");
    }
    throw new Error("dist-ui/index.html bulunamadı — `pnpm --filter mcord-installer build` çalıştır.");
}

async function main() {
    let html;
    try {
        html = loadUiHtml();
    } catch (e) {
        console.error(e.message);
        process.exitCode = 1;
        return;
    }

    const source = safe(() => resolveSourceAsar(join(HERE, "..", "core")));

    const app = new Application();
    const window = app.createBrowserWindow({
        title: "MCord Kurulum",
        width: 520,
        height: 660,
        resizable: false
    });

    window.registerProtocol("mcord", () =>
        new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } })
    );

    const webview = window.createWebview({ url: "mcord://app/index.html" });

    const push = line => {
        try {
            webview.evaluateScript(`window.__mcordProgress && window.__mcordProgress(${JSON.stringify(line)})`);
        } catch { /* pencere kapanmış olabilir */ }
    };

    webview.expose("core", {
        detectInstalls: async () => detectInstalls(),
        install: async id => requireSource(source) ?? coreInstall(id, source, push),
        repair: async id => requireSource(source) ?? coreRepair(id, source, push),
        uninstall: async id => coreUninstall(id, push),
        closeDiscord: async id => closeDiscord(id),
        launchDiscord: async id => launchDiscord(id)
    });

    await app.whenReady();
}

function requireSource(source) {
    return source ? null : { ok: false, code: "SOURCE_NOT_FOUND", message: "MCord paketi (app.asar) bulunamadı." };
}

function safe(fn) {
    try { return fn(); } catch { return null; }
}

main().catch(err => {
    console.error(err);
    process.exitCode = 1;
});
```

> API doğrulaması: kur anında `@webviewjs/webview` README'sindeki güncel imzalarla karşılaştır (`createBrowserWindow`, `createWebview`, `registerProtocol`, `expose`, `evaluateScript`, `whenReady`). Sürüm 0.x, küçük imza kaymaları olabilir — README örneği kaynaktır. `resizable` desteklenmiyorsa parametreyi çıkar.

- [ ] **Step 2: WebView2 yoksa zarif düşüş**

`main.mjs` içinde `new Application()` çağrısını sar:
```js
    let app;
    try {
        app = new Application();
    } catch (e) {
        console.error(
            "MCord Kurulum penceresi açılamadı — Microsoft Edge WebView2 çalışma zamanı gerekli.\n" +
            "İndir: https://go.microsoft.com/fwlink/p/?LinkId=2124703\n" +
            `Ayrıntı: ${e.message}\n\n` +
            "Alternatif: bu dosyayı --branch=stable --yes gibi argümanlarla komut satırından çalıştır."
        );
        process.exitCode = 1;
        return;
    }
```
(Argüman verilince `index.mjs` zaten CLI'a düşüyor; bu mesaj GUI yolunda kalanlar için.)

- [ ] **Step 3: Elle dene (kaynaktan, Windows)**

Run:
```bash
pnpm --filter mcord-installer build
node scripts/installer/src/index.mjs
```
Expected: ~520×660 koyu tema pencere açılır; "taranıyor" → Discord kuruluysa dal listesi, değilse "Discord bulunamadı". Düğmeler tıklanır.
(Discord yoksa kurulum akışı denenemez — dal listesi + hata ekranı görülebiliyorsa yeterli.)

- [ ] **Step 4: Commit**

```bash
git add scripts/installer/src/gui/main.mjs
git commit -m "installer: webview penceresi çekirdek API'sine bağlandı"
```

---

## Task 5: Paketleme (pkg) + CI

**Files:**
- Modify: `scripts/installer/package.json` (Task 3'te `pkg` bloğu yazıldı — burada doğrulanır/düzeltilir)
- Modify: `.github/workflows/release.yml`
- Modify: `.github/workflows/build.yml`

**Interfaces:**
- Consumes: `dist/app.asar` (kök `pnpm dist` çıktısı), `dist-ui/index.html` (`build.mjs` çıktısı), `@webviewjs/webview` prebuild `.node`
- Produces: `dist/MCordInstaller.exe`

- [ ] **Step 1: `pnpm dist` sonrası installer paketle (kaynak, Windows)**

Run:
```bash
pnpm dist
pnpm --filter mcord-installer package
```
Expected: `dist/MCordInstaller.exe` oluşur (~45–55 MB).
Sorun: `pkg` `@webviewjs/webview` `.node`'unu gömemezse → `pkg.assets` globunu prebuild paketinin gerçek adına göre düzelt (`ls scripts/installer/node_modules/@webviewjs`), örn. `node_modules/@webviewjs/webview-win32-x64-msvc/**`.

- [ ] **Step 2: Exe'yi çalıştır**

Run: `./dist/MCordInstaller.exe`
Expected: pencere açılır (kaynaktan çalıştırmayla aynı davranış).
Ayrıca: `./dist/MCordInstaller.exe --branch=stable --yes` → CLI yolu.

- [ ] **Step 3: pkg başarısızsa — Node SEA'ya geçiş notu**

`pkg` `.node` gömme veya ESM ile tıkanırsa (`@yao-pkg/pkg` ESM'i sınırlı destekler), `package` script'ini Node SEA akışına çevir:
1. `src/index.mjs`'i esbuild ile tek CJS dosyaya bundle et (`--platform=node --format=cjs --external:@webviewjs/webview`), `.node` ve `dist-ui`'yi exe yanına kopyala
2. `node --experimental-sea-config sea-config.json` → blob → `postject` ile `node.exe` kopyasına göm
`@webviewjs/webview` dokümantasyonu bu akışı öneriyor. Bu adımı yalnızca pkg gerçekten başarısızsa uygula.

- [ ] **Step 4: `release.yml` — UI build adımı**

`.github/workflows/release.yml` içinde "Package installer" adımından hemen önce:
```yaml
      - name: Build installer UI
        working-directory: scripts/installer
        run: pnpm build
```
Ve "Package installer" adımı zaten `working-directory: scripts/installer` + `run: pnpm package` — `pkg.outputPath`/`--output` `../../dist/MCordInstaller.exe`'yi koruduğundan emin ol.

- [ ] **Step 5: `build.yml` — Windows doğrulama job'ı**

`.github/workflows/build.yml`'e ikinci job ekle:
```yaml
  installer:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      - name: Build app.asar
        run: pnpm dist
      - name: Build installer UI
        working-directory: scripts/installer
        run: pnpm build
      - name: Typecheck installer
        run: pnpm --filter mcord-installer typecheck
      - name: Package installer
        working-directory: scripts/installer
        run: pnpm package
      - name: Smoke — CLI (Discord yok)
        shell: pwsh
        run: |
          $p = Start-Process ./dist/MCordInstaller.exe -ArgumentList '--branch=stable','--yes' -Wait -PassThru -NoNewWindow
          if ($p.ExitCode -ne 1) { throw "Discord yokken exit 1 bekleniyordu, gelen: $($p.ExitCode)" }
      - uses: actions/upload-artifact@v4
        with:
          name: mcord-installer-exe
          path: dist/MCordInstaller.exe
```

- [ ] **Step 6: Commit**

```bash
git add scripts/installer/package.json .github/workflows/release.yml .github/workflows/build.yml
git commit -m "installer: pkg paketleme + CI (Windows build & smoke)"
```

---

## Task 6: Dokümantasyon

**Files:**
- Modify: `scripts/installer/README.md`
- Create: `docs/installer-manual-qa.md`
- Modify: `README.md` (kök — yalnızca gerekirse; kurulum bölümü zaten doğru)

- [ ] **Step 1: `scripts/installer/README.md` güncelle**

GUI'yi birincil, CLI'ı ikincil anlat:
```markdown
# MCord Installer

Windows için pencereli kurulum aracı.

## Kullanım

Çift tıkla → koyu temalı pencere açılır → Discord dalını seç → **Kur** / **Onar** / **Kaldır**.

Komut satırı (CI / otomasyon):

    MCordInstaller.exe --branch=stable --yes
    MCordInstaller.exe --uninstall
    MCordInstaller.exe --repair --branch=canary --yes

`--branch`: stable | ptb | canary

## Ne yapıyor

1. `%LocalAppData%\Discord*\app-<sürüm>\resources` altındaki en yeni kurulumu bulur
2. Discord açıksa kullanıcı onayıyla kapatır
3. `app.asar` → `_app.asar` yedekler, MCord'unkini kopyalar
4. Boyut + SHA-256 doğrular
5. İsteğe bağlı Discord'u başlatır

Kaldırma: `_app.asar`'ı geri yükler, dev enjeksiyonu (`resources/app/`) temizler.

## Mimari

- `src/core/` — UI'dan bağımsız mantık (vitest ile test edilir)
- `src/cli.mjs` — komut satırı akışı
- `src/gui/` — `@webviewjs/webview` penceresi + React UI (esbuild → tek HTML)
- `src/index.mjs` — argüman varsa CLI, yoksa pencere

## Derleme

    pnpm --filter mcord-installer build      # UI → dist-ui/index.html
    pnpm --filter mcord-installer package    # → dist/MCordInstaller.exe

## Windows notları

| Konu | Ele alınış |
|---|---|
| Yönetici hakkı | Gerekmiyor — `%LocalAppData%` kullanıcı alanı |
| Dosya kilidi | `tasklist`/`taskkill` ile süreç kontrolü, kapanma beklenir |
| WebView2 | Sistemdekini kullanır; yoksa CLI'a düşer + bootstrapper linki verir |
| Antivirüs | İmzasız binary yanlış pozitif verebilir; release'de imzalama adımı (sertifika varsa) + SHA256SUMS |
```

- [ ] **Step 2: `docs/installer-manual-qa.md` yaz**

```markdown
# Installer — elle QA kontrol listesi

GUI e2e otomasyonu yok. Sürüm öncesi Windows'ta elle:

## Ön koşul
- [ ] `pnpm dist && pnpm --filter mcord-installer package` → `dist/MCordInstaller.exe` var
- [ ] Test makinesinde Discord (Stable) kurulu

## Pencere
- [ ] Çift tıkla → ~520×660 koyu tema pencere açılır, yeniden boyutlanmaz
- [ ] "taranıyor" kısa görünür, sonra dal listesi
- [ ] Kurulu dallar doğru sürüm + durum rozeti gösteriyor

## Kur
- [ ] Stable seç → **Kur** → log satırları akıyor (yedekleniyor → kopyalanıyor → boyut → sha)
- [ ] Sonuç ekranı ✔ + KB + sha256
- [ ] `%LocalAppData%\Discord\app-*\resources\` içinde `_app.asar` oluştu, `app.asar` MCord'unki
- [ ] "Discord'u başlat" → Discord açılır, MCord yüklü (ayarlar görünür)

## Discord açıkken
- [ ] Discord'u aç, installer'da **Kur** → "Discord kapatılıyor…" → otomatik kapanır → kurulum tamamlanır

## Onar / Kaldır
- [ ] Kurulu dalda **Onar** → yeniden kopyalar + doğrular
- [ ] **Kaldır** → `_app.asar` geri döner, `app.asar` orijinal, pencere `pick`'e döner

## CLI
- [ ] `MCordInstaller.exe --branch=stable --yes` sessiz kurar, exit 0
- [ ] Discord yokken exit 1 + anlaşılır mesaj

## WebView2 yok (opsiyonel, eski Win10 VM)
- [ ] Çift tıkla → konsola bootstrapper linki + CLI önerisi, exit 1
```

- [ ] **Step 3: Commit**

```bash
git add scripts/installer/README.md docs/installer-manual-qa.md
git commit -m "installer: README + elle QA kontrol listesi"
```

---

## Self-review notları (uygulayan okusun)

- **`@webviewjs/webview` API'si sürüme duyarlı.** Task 4 kodu README örneklerine dayanıyor; `pnpm add` sonrası `node_modules/@webviewjs/webview/*.d.ts` veya güncel README ile imzaları doğrula, sapma varsa Task 4 kodunu uyarla (kavram aynı kalır: window + webview + expose + protocol + evaluateScript + event loop).
- **pkg + ESM + `.node` riski gerçek.** Task 5 Step 3 fallback (Node SEA) hazır; pkg ilk denemede çalışmazsa oraya geç, plan akışını bozma.
- **React sürümü:** kök `@types/react` `^19.1.13`. `scripts/installer/package.json`'da `react`/`react-dom`'u uyumlu minor'a sabitle; `pnpm why react` ile tek kopya olduğunu doğrula.
- **`original-fs`:** kök `scripts/build/common.mjs` `nodeCommonOpts.external` içinde `original-fs` var — o MCord'un kendi main süreci için, installer'la ilgisi yok, dokunma.
- **vitest `.mjs`:** kök config'e `scripts/installer/src/**/*.test.mjs` eklendi; `pnpm test` artık installer testlerini de koşar, `pnpm test -- scripts/installer` ile daraltılır.
- **Lint:** `eslint-plugin-simple-header` yeni dosyalarda tam header bloğu ister; `simple-import-sort` import gruplarını sıralar (node → paket → yerel). Örnek kodlar buna uygun yazıldı.
