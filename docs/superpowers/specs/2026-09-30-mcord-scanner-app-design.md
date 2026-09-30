# MCord Scanner — tasarım

Tarih: 2026-09-30 · Durum: onaylandı

## Amaç

Discord güncellemesi MCord'un bir patch'ini ya da finder'ını kırdığında (ya da kırmak
üzereyken) bunu **crash'ten önce** yakalamak ve düzeltmeyi yazmak için gereken her şeyi
tek bir dosyada (`fix-brief.md`) vermek. Kullanıcı ara sıra app'i açıp tarar, brief'i
Claude'a atar; Claude ek açıklama beklemeden düzeltmeyi yapar ve CLI ile doğrular.

Mevcut araçların eksiği: CI reporter (`scripts/generateReport.mjs`) ve `scanner/` yalnızca
"kırık" der; kodun yeni build'de **nereye gittiğini ve nasıl göründüğünü** söylemez. Scanner'ın
asıl katkısı bu teşhis katmanıdır.

## Kapsam dışı (sonraki aşamalar)

- CI'ın baseline'ları otomatik güncellemesi
- Zamanlanmış canary izleme / bildirim
- Kullanıcının kurulu masaüstü Discord'una bağlanma
- Düzeltmeyi app'in kendisinin uygulaması (düzeltmeyi Claude yapar)

## Yerleşim

- App: `scanner/` (yerel, `.gitignore`'da kalır). Mevcut `src/` motoru yeniden kullanılır.
- Baseline'lar: repo kökünde `baselines/<branch>.json` (commit'lenir; token/kişisel veri içermez).
- MCord değişikliği: yalnızca `src/debug/reporter.ts` (reporter build'ine özel; üretimde stub).

## Kullanıcı akışı

1. İlk açılış → giriş ekranı: **token alanı** veya **Discord'un kendi giriş sayfası** (QR / şifre+2FA).
2. Ana ekran: dal seçimi (stable / canary / ptb) → **[Tara]** → ilerleme (chunk / modül / kontrol).
3. Sonuç listesi: ✅ sağlam · ⚠️ kaymış · 💥 kırık · ❔ kapsama dışı.
4. **[Brief'i kaydet]** / **[Kopyala]** → `scanner/out/<branch>-<build>/fix-brief.md`.
5. **[Çıkış yap]**: şifreli token'ı ve oturum profilini siler.

## Bileşenler

### 1. Kabuk (Electron)
- Discord, `persist:mcord-scanner` oturumunda ayrı bir `BrowserWindow`'da (varsayılan gizli,
  "Discord'u göster" ile görünür) açılır. Kullanıcının kendi Discord verisiyle ortak bir şey yok.
- Token `safeStorage` (Windows DPAPI) ile şifrelenip `scanner/.state/token.bin`'e yazılır.
  Giriş: Discord sayfası yüklenmeden önce preload, token'ı Discord'un beklediği `localStorage`
  anahtarına koyar; sayfa oturumla açılır. Token hiçbir log/dump/brief'e girmez
  (`util/secrets.ts` `mask()` tüm çıktıların son adımı).
- Ağ: yalnızca `*.discord.com`, `*.discordapp.com`, `*.discordapp.net`, `*.discord.media` ve (teşhis için) `raw.githubusercontent.com`
  / `api.github.com` (Vencord). Diğer istekler oturum düzeyinde engellenir.
- Hesap salt okunur kullanılır: mesaj göndermez, sunucuya katılmaz, ayar değiştirmez.

### 2. Toplayıcı
- Tarama başında MCord reporter build'i üretilir (`pnpm buildReporter`, MCord repo yolu ayarlanabilir,
  varsayılan `..`). `dist/renderer.js`, Discord script'lerinden **önce** enjekte edilir
  (`generateReport.mjs`'deki `evaluateOnNewDocument`'in Electron karşılığı: preload + `webFrame`).
- Reporter koşusu (mevcut): tüm chunk'lar `loadLazyChunks` ile yüklenir, patch/finder'lar gerçek
  koşulda denenir.
- **Reporter'a eklenen scanner çıktısı** (`IS_REPORTER` build'inde, `window.MCordScannerSink`
  varsa çağrılır, yoksa hiçbir şey yapmaz):
  - her patch için: plugin, canonical `find`, replacement `match`'leri, eşleşen modül id'leri,
    sonuç (uygulandı / tutmadı / hata)
  - her finder için: açıklama, eşleşen modül id'si, dönen değerin şekli (tip + ilk düzey anahtarlar)
  - tüm modül kaynakları (`wreq.m`), 500'lük paketler hâlinde
  - yüklenemeyen chunk'lar
- Veriler IPC ile ana sürece akar; analiz Discord'un ana thread'inde **yapılmaz** (donma riski).

### 3. Motor (Node)
- Mevcut `pipeline` / `BuildIndex` / `extract` yeniden kullanılır. Kesin (runtime) sonuç statik
  sonucu ezer; statik analiz yalnızca `dosya:satır` eşlemesi (plugin + find) ve teşhis için kullanılır.
- Durumlar: `sağlam`, `kaymış`, `kırık-find`, `kırık-match`, `çoklu`, `hata` (patch kodu patlatıyor),
  `şekil-değişti` (finder), `kapsama-dışı` (modülün chunk'ı yüklenemedi).

### 4. Baseline
- Anahtar: `plugin + sha(find)` (patch) / `plugin + describe` (finder).
- Kayıt: build kimliği, modül parmak izi (kararlı string'ler, `#{intl::}` hash'leri, export adları,
  `structHash`), eşleşme bölgesinin ±400 karakterlik kesiti, finder şekli.
- Sağlam sonuçlar baseline'ı günceller; kırık/kaymış sonuçlar eski baseline'ı **silmez**.
- **Kayma:** eşleşme bölgesi baseline kesitine benzerliği (token düzeyinde) eşiğin (0.6) altındaysa
  veya modül `structHash`'i değiştiyse ⚠️.

### 5. Teşhis
Kırık / kaymış / şekil-değişti her kayıt için:
1. **Halef modül:** baseline parmak izine göre modülleri puanla (string/intl örtüşmesi ağırlıklı,
   export adı ve `structHash` eşitliği bonus). İlk 3 aday + puan. Baseline yoksa eski `find`'ın
   literal parçalarıyla aynı puanlama.
2. **Bölge hizalama:** baseline kesitindeki çapa string'lerini yeni modülde bul, en iyi pencereyi
   (±400) çıkar.
3. **`find` önerisi:** hizalanan bölgede tüm build'de tek modülde geçen en kısa çapa string'i
   (intl ise `#{intl::KEY}` biçiminde).
4. **Vencord karşılığı:** aynı adlı plugin Vencord `main`'de varsa oradaki güncel `find`/`match`'ler
   (GitHub, günlük önbellek; ağ yoksa atlanır).
5. **Güven:** yüksek / orta / düşük, kısa gerekçeyle. Halef bulunamazsa "modül kaldırılmış olabilir".

### 6. Brief (`fix-brief.md`)
- Başlık: dal, build, MCord commit'i, tarih, kapsama yüzdesi, özet tablo.
- **Uygulama kuralları** (Claude için): `#{intl::KEY}` şartı; geniş `.+?` yasağı; önce Vencord
  karşılığı; plugin/özellik silme yok; bitince `pnpm scan --branch <dal>` ile 0 kırık doğrula; commit.
- Sorunlar önem sırasıyla (hata > kırık > şekil-değişti > kaymış): plugin, `dosya:satır`,
  MCord'daki mevcut tanım kodu, durum, eski kesit / yeni kesit, adaylar, Vencord karşılığı,
  önerilen `find`, güven.
- Ayrı bölüm: düzeltilemeyenler (karar kullanıcıda).
- Sonda makine okunur JSON bloğu. Toplam boyut hedefi < 500 KB (kesitler kırpılır).

### 7. CLI
`pnpm scan --branch <stable|canary|ptb> [--mcord <yol>]`: Electron'u pencere göstermeden açar,
kayıtlı oturumu kullanır, brief'i yazar, yolunu ve özeti basar. Kırık varsa exit 1.
Oturum yoksa "önce app'ten giriş yap" deyip çıkar.

## Hata durumları
- Geçersiz/süresi dolmuş token → giriş ekranı, neden gösterilir.
- Discord yüklenmezse / reporter 15 dk'da bitmezse / 90 sn sessizlik → zaman aşımı, o ana kadarki
  veriyle kısmi brief ("eksik tarama" işaretli).
- Yüklenemeyen chunk'lar → `kapsama-dışı`, kırık sayılmaz.
- `pnpm buildReporter` başarısız → tarama başlamaz, derleme çıktısı gösterilir.

## Test
- vitest: baseline yaz/oku, kayma eşiği, halef puanlama, bölge hizalama, `find` önerisi, brief
  render — sahte "eski build / yeni build" modül fixture'larıyla. Mevcut testler korunur.
- `mask()` tüm çıktı yollarında: fixture'a konan sahte token brief'te/log'da görünmemeli.
- Kabuk ve gerçek tarama: elle (stable'da uçtan uca bir koşu).
