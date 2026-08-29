# Recovery

Çökmeleri yakalar, sorumlu plugin'i kapatır ve Discord'u toparlar.

**Çekirdek plugin** — `required: true`. Plan §8'in tamamı bu plugin'de.

## Nasıl çalışır

### 1. Hata yakalama

Discord'un `ErrorBoundary` bileşeni `_handleSubmitReport` prototype anahtarıyla
bulunur (prototype üzerinde olduğu için mangle edilmez) ve `render`'ına `after`
patch'i uygulanır.

### 2. Suçlu plugin tespiti

BD stack trace'te plugin dosya URL'si arar; bizim pluginlerimiz tek bundle içinde
olduğu için o yöntem çalışmaz. Bunun yerine **patch registry üzerinden atıf**:

| Kaynak | Yöntem |
|---|---|
| Fonksiyon patch'i | `recentPatchErrors` tamponu (son 10 sn) |
| Kod patch'i | Stack'teki `WebpackModule<id>` → `SYM_PATCHED_BY` |

Minify/inline edilmiş stack'lerde regex'ten daha güvenilir.

### 3. Kurtarma adımları

Her biri kendi try/catch'inde: `LAYER_POP_ALL` → `MODAL_POP_ALL` →
`CONTEXT_MENU_CLOSE` → `/channels/@me` → `closeAllModals`. Hepsi başarılıysa
hata ekranı kapanır ve Discord kaldığı yerden devam eder.

### 4. Çökme döngüsü kırıcı

- Aynı plugin art arda **3 kez** çöktürürse kalıcı olarak kapatılır.
- 5 dakika sorunsuz oturumdan sonra sayaçlar sıfırlanır.
- Açılış tamamlanmadan kapanma olursa bir sonraki açılış **güvenli modda** başlar.

## Arayüz

Hata ekranına eklenenler: "Kurtarmayı Dene", açılır hata detayları
(`min(0.6 × pencere yüksekliği, 534px)`, pencere yeniden boyutlandırıldığında
güncellenir), ön doldurulmuş "GitHub'da Bildir" ve "Güvenli Mod".

Suçlu plugin kapatıldığında `duration: Infinity` bir bildirim gösterilir —
kullanıcı kapatana kadar durur. Dev build'lerde "Yeniden Etkinleştir" aksiyonu eklenir.

## requiresRestart

`false`.
