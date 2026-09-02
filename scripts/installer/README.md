# MCord Installer

Windows için pencereli kurulum aracı — `dist/MCordInstaller.exe`.

## Kullanım

Çift tıkla → koyu temalı pencere açılır → Discord dalını seç →
**Kur** / **Onar** / **Kaldır**.

Komut satırı (CI / otomasyon / WebView2 yoksa):

```
MCordInstaller.exe --branch=stable --yes
MCordInstaller.exe --uninstall
MCordInstaller.exe --repair --branch=canary --yes
```

`--branch`: `stable` | `ptb` | `canary` · `--yes` / `-y`: soru sorma

## Ne yapıyor

1. `%LocalAppData%\Discord*\app-<sürüm>\resources` altındaki en yeni kurulumu
   bulur (Stable / PTB / Canary ayrı)
2. Discord açıksa **onayla** kapatır, kapanmasını bekler
3. `app.asar` → `_app.asar` yedekler, MCord'un `app.asar`'ını kopyalar
4. **Boyut + SHA-256** doğrular
5. İsteğe bağlı Discord'u başlatır (`Update.exe --processStart`)

Kaldırma: `_app.asar`'ı geri yükler, dev enjeksiyonu (`resources/app/`) temizler.
Yönetici hakkı gerekmez — `%LocalAppData%` kullanıcı alanı.

## Mimari

| Yol | Sorumluluk |
|---|---|
| `src/core/` | UI'dan bağımsız mantık — keşif, süreç kontrolü, asar takası, doğrulama. `Result` döner, `throw` etmez. Vitest'lenir. |
| `src/cli.mjs` | Komut satırı akışı (readline) |
| `src/gui/main.mjs` | `@webviewjs/webview` penceresi — `mcord://` protokolü + `webview.expose("core", …)` |
| `src/gui/ui/` | React arayüzü (esbuild → tek HTML string) |
| `src/index.mjs` | Argüman varsa CLI, yoksa pencere |

`node:fs` kullanılır — `original-fs` yalnızca Electron içinde vardır ve
paketlenmiş exe'de bulunamaz.

## Derleme

```
pnpm --filter mcord-installer build      # UI + app.asar payload + installer.cjs
pnpm --filter mcord-installer package    # + pkg → dist/MCordInstaller.exe
```

`build.mjs` üç şey üretir (hepsi `.gitignore`'da):
- `dist-ui/index.html` — gömülü CSS+JS'li tek dosya UI
- `src/gui/ui.generated.mjs` — aynı HTML, string olarak (bundle + dev ortak)
- `src/core/payload.generated.mjs` — `dist/app.asar` base64 gömülü

`package` önce `pnpm dist` ister (repo kökünde `dist/app.asar`).

## Windows notları

| Konu | Ele alınış |
|---|---|
| WebView2 | Sistemdekini kullanır (Win11 hazır, Win10 otomatik). Yoksa pencere açılmaz → CLI'a düş, mesajda bootstrapper linki |
| WebView2 veri klasörü | `%TEMP%\mcord-installer-webview` — exe yanı (Program Files) çoğu zaman engelli |
| Dosya kilidi | Discord açıkken `app.asar` kilitli; `tasklist`/`taskkill` ile kontrollü kapatma |
| `pkg` + ESM | `pkg` dinamik `import`/top-level await'i çalıştıramaz → önce esbuild ile tek CJS'e bundle edilir |
| Antivirüs | İmzasız binary yanlış pozitif verebilir; release'de imzalama adımı (sertifika varsa) + `SHA256SUMS.txt` |

Elle QA: [`docs/installer-manual-qa.md`](../../docs/installer-manual-qa.md)
