# MCord Scanner 2.0: tasarım ve plan

> **Ajanlar için:** superpowers:subagent-driven-development ile task task uygulanır. Kullanıcı tam yetki verdi; onay beklenmez.

**Amaç:** Scanner'ı üç yönde geliştirmek:
- **İşlev:** "taradım, brief'i Claude'a verdim, otomatik düzeltildi" akışını sağlamlaştırmak.
- **Araç:** Discord'un tüm modüllerini, store'larını ve MCord'un tüm patch ve finder'larını gezilebilir hâle getirmek. Sıfırdan bir plugin ya da motor yazarken kullanılabilecek bir gezgin ve regex test alanı eklemek.
- **Kullanım:** arayüzü durum işaretleriyle (✅ ❗ ⚠️ ⓘ) çok anlaşılır hâle getirmek.

**Mevcut durum:**
- Scanner `C:\Users\Berk\Desktop\MCord\scanner` (yerel git, son commit `eef5a37`).
- MCord main `a881d03`.
- Son gerçek tarama: 0 sorun.

## Global kısıtlar (v1'den aynen geçerli)
- Scanner dosyaları hook nedeniyle staging kopyası üzerinden yazılır (`<worktree>/.superpowers/sdd/staging/scanner/<yol>` → cp → cmp). Heredoc, echo, sed ya da script ile kaynak üretilmez.
- Token hiçbir dosyaya düz yazılmaz; log, payload, brief ve indekse girmez (`mask()`).
- Discord hesabı salt okunur kullanılır.
- MCord'da yeni kod yalnızca `IS_REPORTER` arkasında ya da `reporter.ts` üzerinden import edilen dosyalarda olur. Üretim paketinde `MCordScannerSink` sayısı 0 kalmalıdır.
- Plugin, dosya ya da özellik silinmez.
- Commit mesajları Türkçe, Claude trailer'ı yok.
- MCord iş bitince main'e ff-merge edilip push edilir. Scanner hiçbir zaman push edilmez.
- Sabitler: kayma eşiği 0.6, kesit yarıçapı 400, aday sayısı 3, brief üst sınırı 500 KB.

## Durum düzeyleri (tek kaynak: `src/scan/levels.ts`)
| Düzey | İşaret | Renk | Durumlar |
|---|---|---|---|
| `ok` | ✅ | yeşil | sağlam |
| `error` | ❗ | kırmızı | hata, kırık-find, kırık-match, şekil-değişti |
| `warn` | ⚠️ | sarı | çoklu, kaymış |
| `info` | ⓘ | gri | ortam kısıtlı, susturulmuş |

Brief, indeks, arayüz ve CLI özetinin hepsi bu eşlemeyi kullanır.

---

### Task A: İndeks ve düzeyler (motor)
- `src/scan/levels.ts`: `Level`, `levelOf(status)`, `LEVEL_ICON`, `worst(levels)`.
- `src/index/buildIndex.ts`, `buildIndex(payload, defs, entries, envLimited)`, `ScanIndex` üretir:
  - `meta`
  - `modules[]`: `{ id, size, exports, strings(8), usedBy: key[] }`
  - `patches[]` ve `finders[]`: `{ key, plugin, label, status, level, locations, moduleId }`
  - `stores[]`: `{ name, moduleId, usedBy }`. `displayName="X"` ve `static displayName=` taranarak bulunur.
  - `plugins[]`: `{ name, file, level, counts, keys }`. Finder'lar, `locations[].file` içindeki `src/plugins/<dir>` üzerinden plugin'e bağlanır. `_api`, `_core` ve `webpack/common` kendi grupları olur.
  - `summary`: düzey başına sayılar.
- `runScan`, indeksi `outDir/index.json` olarak yazar (mask'lenmiş). `RunScanResult` `indexPath` alanını taşır.
- CLI özeti düzeylerle yazılır (✅ N · ❗ N · ⚠️ N · ⓘ N).
- Testler: düzey eşlemesi, plugin gruplama, store bulma, indeks boyutu (fixture).

### Task B: Daha az yanlış alarm, daha iyi halef, kesit farkı (motor)
- **Susturma dosyası:** MCord'da `baselines/suppressions.json`, biçim `{ "<key>": { "reason": "…", "until": "<build hash ya da tarih, isteğe bağlı>" } }`. Eşleşen kayıt düzey `info`, durum aynı, detail'e "susturuldu: <reason>" eklenir. Problem sayısına ve çıkış koduna girmez. Gerekçesiz kayıt reddedilir.
- **Halef puanı:** `0.75·IDF-string + 0.15·export benzerliği (anlamlı adlar) + 0.10·structHash eşitliği`. Tek ölçek, eşik 0.2.
- **`src/diagnose/diff.ts`:** eski ve yeni kesit arasında token düzeyinde fark. Markdown için `[-eski-]{+yeni+}` biçiminde kısa bir gösterim üretir, arayüz için yapısal parçalar döndürür. Brief'te "Değişenler" bölümü olarak çıkar (bütçe dahilinde).
- Testler.

### Task C: Otomatik onarım (motor; zor, Opus)
- `extract.ts` replacement'ın `replace`'ini de alır: string ise metni, fonksiyon ise `{ kind: "function" }`.
- `src/diagnose/repair.ts`, `repairPatch(entry, payload, defs, vencord)`, kırık-find, kırık-match, hata ve çoklu için çalışır:
  - **Find adayları:**
    1. `suggestFind` sonucu
    2. Vencord'un güncel find'ı
    3. eski find'ın literal parçaları arasından hedef modülde tek olanlar
  - **Match adayları:**
    1. Vencord'un güncel match'i
    2. eski match'in yeni kesite genelleştirilmiş hâli: tanımlayıcılar `\i` olur, sayılar ve kısa string'ler esnetilir, `.{0,N}` aralıkları yeni kesitte ölçülüp güncellenir
    3. eski match'in parçalarından türetilen dar regex
  - **Her aday doğrulanır:**
    - find tüm build'de tam bir modülde tutar (`all` değilse);
    - match hedef modülde tutar;
    - replace string'se uygulanmış modül `acorn` ile parse edilir;
    - geniş desen yasağı: `.+?` ve `.*?` ancak aralık sınırı varsa kabul edilir;
    - intl hash çıplak kalmaz, `#{intl::…::raw}` biçimine çevrilir.
  - Doğrulanan en iyi aday `{ find, match, replace?, checks[] }` olarak brief'e "Önerilen düzeltme (doğrulandı ✅)" bölümüyle girer. Doğrulanamayan adaylar "denendi, olmadı" diye kısaca yazılır.
- `acorn` scanner'a bağımlılık olarak eklenir.
- Testler: gerçek kırılma biçimlerinden fixture'lar. Bu turdaki GifPaste (parametre imzası değişti), NoOnboardingDelay (aralık uzadı) ve ImageLink (find taşındı) desenleri `test/fixtures/repair/` altına küçük kesitler olarak konur.

### Task D: Geçmiş, karşılaştırma, saklama (motor)
- `out/history.json`: her taramanın özeti (zaman, dal, build, düzey sayıları, modül sayısı, `indexPath`).
- `compareScans(prevIndex, curIndex)`: eklenen, silinen ve değişen modüller (srcHash üzerinden; indeks `srcHash` taşır) ve bölgesi değişen patch'ler (kesit hash'i). Brief başında "Önceki taramadan beri: …" satırı olarak çıkar.
- **Saklama:** en yeni 5 taramanın `payload.json` dosyası tutulur. Eskilerin yalnızca `payload.json`'u silinir; `index.json`, `fix-brief.md` ve history kalır.
- Testler.

### Task E: Arayüz 2.0 (Opus)
- **Yerleşim:** sol tarafta sekmeler.
- **Özet:** büyük sağlık kartı (✅ / ❗ / ⚠️ / ⓘ sayıları), son tarama, build, dal seçimi, "Tara" ve "Hepsini tara" (stable, ptb, canary sırayla), aşamalı ilerleme (açılış → chunk'lar → aktarım → analiz), "Claude için kopyala" ve "Brief'i aç".
- **Plugin'ler:** arama ve filtre (düzey). Satır açılınca altında patch ve finder'lar, her birinde durum, `dosya:satır` ve detay. Önerilen düzeltme kopyalanabilir.
- **Patch'ler ve finder'lar:** tablo; arama, düzey filtresi, sıralama.
- **Modüller:** sanal liste (20 bin satır). Id, string ya da export ile arama, regex araması da var (ana süreçte payload üzerinden). Bir modüle tıklayınca:
  - kaynak görüntüleyici: biçimlendirilmiş (basit girintileme), aramayla vurgulama, büyük modüllerde sayfalama;
  - "bu modülü kullanan MCord tanımları";
  - "benzersiz find öner".
- **Store'lar:** liste ve arama, store'a tıklayınca modülü açılır.
- **Regex test alanı:** find, match ve replace alanları, `\i` ve `#{intl::KEY}` desteği. Sonuç: find'ın tuttuğu modüller, match'in her modüldeki eşleşmesi (bağlamıyla), replace sonrası parse sonucu ✅ ya da ❗. Intl çözücü: anahtar → hash ve geçtiği modüller.
- **Geçmiş:** tarama listesi ve iki taramanın karşılaştırması.
- **Giriş:**
  - token alanında göster/gizle;
  - **"Beni hatırla"** kutusu, varsayılan açık. Kapalıysa token yalnızca ana süreç belleğinde tutulur, `token.bin` yazılmaz ya da silinir;
  - Discord sayfasıyla giriş.
- **Tasarım:** koyu ve açık tema, sistem fontu, net renk kontrastı, boş ve hata durumları, klavye kısayolları (Ctrl+F arama, Ctrl+R tara).
- **Teknik:**
  - İndeks ve payload ana süreçte yüklenir; IPC ile sayfa sayfa sorgulanır (`ui:query`).
  - Renderer'da düz TypeScript ve DOM kullanılır, framework yok. Sanal liste kendi yazılır.
  - Güvenlik değişmez: sandbox, IPC'de gönderen denetimi, CSP, `innerHTML` yasağı.
- **Doğrulama:** Electron'da canlı kontrol (puppeteer-core ile uzaktan hata ayıklama), bir indeks fixture'ı ile sekmeler gezilir. Gerçek token girilmez.

### Task F: Bütünleştirme, gerçek tarama, merge
- Bütün dalın son incelemesi (Opus).
- Kayıtlı oturumla gerçek tarama (stable, ayrıca ptb ve canary). İndeks, brief ve arayüz kontrol edilir.
- README güncellenir, hafıza güncellenir, MCord main'e merge ve push edilir.
