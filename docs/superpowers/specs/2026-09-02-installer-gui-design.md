# MCord Installer — pencereli GUI (tasarım)

**Tarih:** 2026-09-02
**Durum:** onaylandı (brainstorming)
**Kapsam:** `scripts/installer/` — konsol aracını, aynı mantığı koruyarak pencereli
bir kurulum aracına dönüştürmek.

## 1. Amaç

referans katalog gibi: `MCordInstaller.exe`'ye çift tıkla → koyu temalı bir pencere
açılır → Discord kurulumunu kendi bulur → **Kur / Kaldır / Onar** düğmeleri →
ilerleme + sonuç ekranı. NSIS sihirbazı **yok**, tek taşınabilir exe.

Başsız (CLI) mod korunur: `MCordInstaller.exe --branch=stable --yes`,
`--uninstall`. CI ve güç kullanıcıları için.

## 2. Teknoloji kararları

| Konu | Karar | Gerekçe |
|---|---|---|
| Pencere | `@webviewjs/webview` (Rust `wry`/`tao`, N-API) | Aktif bakımlı; Windows'ta sistem **WebView2**'yi kullanır, Chromium gömmez |
| WebView2 runtime | Sistemdekine güven; yoksa yerel diyalog + Evergreen bootstrapper linki | Win11'de hazır, Win10'da ~2021'den beri neredeyse her yerde; bootstrapper'ı gömmek boyutu şişirir |
| UI | React 19 + esbuild → tek self-contained HTML | Stack'te zaten var; zengin/etkileşimli UI için en rahatı |
| UI yükleme | Özel `mcord://` protokolü (bellekten servis) | `data:` URI boyut sınırlarından kaçınır |
| Paketleme | `@yao-pkg/pkg` (mevcut) → tek exe, `.node` asset olarak | release.yml zaten pkg kullanıyor; pkg tıkanırsa Node SEA yedek |
| Otomatik güncelleme | Installer'da **yok** | Ana uygulamanın kendi updater'ı var (`src/main/updater.ts`) |
| Boyut hedefi | ~50 MB ham, Brotli ile ~30 MB | Kullanıcı A1'i (saf JS, ~40–50 MB) seçti |

## 3. Mimari

UI'dan tamamen bağımsız saf mantık çekirdeği + iki giriş noktası.

```
scripts/installer/
  src/
    core/
      discord.mjs      # install keşfi + süreç kontrolü (mevcut, ufak düzeltme)
      install.mjs      # asar takası + SHA-256 doğrulama
      result.mjs       # ortak sonuç tipi (aşağıda)
    gui/
      main.mjs         # webview penceresi, core'u expose eder, mcord:// protokolü
      ui/
        index.html     # esbuild şablonu
        main.tsx       # React kök
        App.tsx        # durum makinesi
        components/    # BranchList, ActionBar, ProgressLog, ResultScreen
        theme.css      # Discord koyu teması token'ları
    cli.mjs            # başsız mod (mevcut index.mjs mantığı taşınır)
    index.mjs          # arg var → cli.mjs, yok → gui/main.mjs
  build.mjs            # esbuild: ui/ → dist-ui/index.html (JS+CSS inline)
  package.json         # + @webviewjs/webview, react, react-dom
```

### 3.1 `core/` — saf mantık

Mevcut `discord.mjs` ve `install.mjs` buraya taşınır. Değişiklikler:

- **`original-fs` → `node:fs`.** `original-fs` yalnızca Electron içinde vardır;
  paketlenmiş Node exe'sinde `Cannot find module` verir. Standalone süreçte `fs`
  zaten yamalanmamış — `app.asar` normal bir dosya gibi görünür, `original-fs`
  hem yanlış hem gereksiz.
- **Hiçbir core fonksiyonu sınır ötesine `throw` etmez.** Hepsi
  `Result` döndürür:

  ```js
  // core/result.mjs
  export const ok   = (data)          => ({ ok: true,  data });
  export const err  = (code, message) => ({ ok: false, code, message });
  ```

- Süreç çalıştırıcı (`tasklist`/`taskkill`/`start`) enjekte edilebilir yapılır
  (test için mock'lanır).

Dışa açılan API:

| Fonksiyon | Döner |
|---|---|
| `detectInstalls()` | `ok([{ id, name, version, installed, hasDevInjection, running }])` |
| `install(branchId, sourceAsar, onProgress)` | `ok({ size, sha256 })` / `err(...)` |
| `uninstall(branchId, onProgress)` | `ok({ restored })` / `err(...)` |
| `repair(branchId, sourceAsar, onProgress)` | `install` ile aynı; kuruluyken de zorla yeniden kopyalar + doğrular |
| `closeDiscord(branchId)` | `ok()` (kapanana kadar bekler, max ~5 sn) / `err("DISCORD_STILL_RUNNING")` |
| `launchDiscord(branchId)` | `ok()` |

Hata kodları: `NO_DISCORD`, `DISCORD_RUNNING`, `ASAR_NOT_FOUND`,
`SOURCE_NOT_FOUND`, `VERIFY_SIZE`, `VERIFY_SHA`, `NOT_INSTALLED`, `FS_PERMISSION`.

### 3.2 `gui/main.mjs`

1. WebView2 var mı bak (registry / `webview` init denemesi). Yoksa: yerel mesaj
   kutusu → "WebView2 gerekli" + `https://go.microsoft.com/fwlink/p/?LinkId=2124703`
   linki, çık.
2. Pencere: ~520×640, yeniden boyutlanmaz, başlık "MCord Kurulum".
3. `mcord://app/` → gömülü `index.html` (esbuild çıktısı).
4. `webview.expose("core", { detectInstalls, install, uninstall, repair,
   closeDiscord, launchDiscord })` — argüman/sonuç JSON-serileştirilebilir.
5. İlerleme: core'un `onProgress(line)` callback'i
   `webview.eval("window.__mcordProgress(...)")` ile UI'a satır iter.
6. `source app.asar` çözümü mevcut `resolveSourceAsar()` mantığıyla aynı
   (exe yanında / `dist/`).

### 3.3 `gui/ui/` — React durum makinesi

| Durum | Ekran |
|---|---|
| `loading` | "Discord kurulumları taranıyor…" |
| `pick` | Dal listesi (Stable/PTB/Canary, sürüm, durum rozeti) + seçim + **Kur/Kaldır/Onar** |
| `discord-running` | "Discord açık — app.asar kilitli" + [Discord'u kapat] |
| `working` | İlerleme çubuğu + canlı log (yedekleniyor → kopyalanıyor → boyut → SHA-256) |
| `done` | ✔ boyut + `sha256:…` + [Discord'u başlat] [Kapat] |
| `error` | ✘ kod + mesaj + [Tekrar dene] [Kapat] |
| `no-discord` | "%LocalAppData% altında Discord bulunamadı." |

Tema: Discord renk token'ları (`#313338`, `#2b2d31`, `#5865f2` accent, vb.),
MCord logosu (varsa `src/` içinden, yoksa basit metin başlık).

### 3.4 `cli.mjs`

Mevcut `index.mjs` mantığı buraya taşınır, `readline` etkileşimi korunur,
ama `core/` API'sini (Result tipi) kullanacak şekilde uyarlanır.

### 3.5 `index.mjs`

```js
const hasArgs = process.argv.slice(2).some(a => a.startsWith("--") || a === "-y");
if (hasArgs) await import("./cli.mjs");
else await import("./gui/main.mjs");
```

## 4. Veri akışı (kur senaryosu)

1. UI yüklenir → `core.detectInstalls()` → `pick` ekranı
2. Kullanıcı dal + **Kur** seçer
3. `core.install(id, src, onProgress)`
   - Discord çalışıyorsa → `err("DISCORD_RUNNING")` → UI `discord-running`
   - Kullanıcı [Discord'u kapat] → `core.closeDiscord(id)` → tekrar `install`
   - `_app.asar` yedeği (yoksa) → bizim `app.asar` kopyalanır → boyut + SHA-256
   - Her adım `onProgress` ile log'a
4. `ok({size, sha256})` → `done` ekranı

## 5. Hata yönetimi

- Core sınırında `throw` yok; hep `Result`.
- UI her `err` kodunu insanca metne çevirir (tablo `App.tsx` içinde).
- `VERIFY_SHA` / `VERIFY_SIZE`: kritik — "kopyalama bozuldu, Discord'u açma,
  tekrar dene" mesajı; yedek `_app.asar` yerinde bırakılır.
- Beklenmeyen istisna (core dışı): `main.mjs` global handler → `error` ekranına
  `code: "INTERNAL"` iter, stack'i stderr'e yazar.
- CLI mod: `err` → stderr + `process.exitCode = 1`.

## 6. Test

- **Birim (vitest, mevcut altyapı):** `core/` — geçici sahte `%LOCALAPPDATA%`
  ağacı kurar:
  - `detectInstalls`: 0/1/çok dal, sürüm sıralaması (`app-1.0.10` > `app-1.0.9`)
  - `install`: yedek oluşturma, idempotentlik (iki kez çağır), boyut/SHA doğrulama
  - `uninstall`: `_app.asar` geri yükleme, dev enjeksiyon temizliği
  - süreç çalıştırıcı mock'lu — `DISCORD_RUNNING` yolu
  - **regresyon:** `install` düz `node:fs` ile çalışır (`original-fs` yok)
- **Smoke (CI, windows-latest):** exe'yi derle, `MCordInstaller.exe --branch=stable
  --yes` → Discord yokken temiz `NO_DISCORD` çıkışı; `--help` çıktısı.
- **GUI:** otomatik e2e yok. `docs/` içinde manuel kontrol listesi (pencere açılıyor,
  dal görünüyor, kur/kaldır çalışıyor, Discord açıkken kilit mesajı).

## 7. CI / paketleme değişiklikleri

- `scripts/installer/package.json`:
  - `+ @webviewjs/webview` (dep), `+ react`, `+ react-dom` (bundle'a girer)
  - `scripts.build`: `node build.mjs` (esbuild UI derleme)
  - `scripts.package`: pkg çağrısı + `pkg.assets` içine `@webviewjs/webview`
    prebuild `.node` yolu ve `dist-ui/**`
- `.github/workflows/release.yml`: "Package installer" adımından önce
  `pnpm --filter mcord-installer build`
- `.github/workflows/build.yml` (opsiyonel): PR doğrulaması için bir
  `windows-latest` job'ı — UI derle + `pnpm --filter mcord-installer package` +
  smoke. (Şimdilik dışarıda bırakılabilir.)
- Root `package.json`: değişiklik gerekmez; `pnpm dist` yine `app.asar` üretir,
  installer ayrı paketlenir.
- Exe adı: `MCordInstaller.exe` (değişmez), README güncellenmez (zaten doğru).

## 8. Kapsam dışı (YAGNI)

- NSIS / MSI / kurulum sihirbazı
- Otomatik güncelleme (ana uygulamada var)
- Linux/macOS
- WebView2 bootstrapper'ını exe'ye gömmek
- Çoklu dil / i18n (UI Türkçe, mevcut proje diliyle tutarlı)
- Kod imzalama (release.yml'de sertifika varsa çalışan adım zaten mevcut)

## 9. Riskler

| Risk | Azaltma |
|---|---|
| `@yao-pkg/pkg` wry `.node`'unu gömemezse | Node SEA'ya geç (Node 20+ yerleşik); `@webviewjs/webview` docs SEA akışını öneriyor |
| WebView2 yok (eski Win10) | Başlangıçta tespit + bootstrapper linki; CLI mod etkilenmez |
| `mcord://` özel protokol wry sürümünde farklı API | Yedek: `webview.setHtml(string)` (wry `with_html`) |
| Antivirüs yanlış pozitifi (imzasız asar takan exe) | release.yml'de imzalama adımı sertifika varsa çalışıyor; SHA256SUMS yayınlanıyor |
