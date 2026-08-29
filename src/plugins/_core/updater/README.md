# Updater

Yeni MCord sürümlerini kontrol eder ve changelog'lu bildirim gösterir.

**Çekirdek plugin** — `required: true`.

## Nasıl çalışır

Sadece http modu — kullanıcının git kurulu olmasını beklemiyoruz (plan §10.1).
GitHub Releases API'sinden son sürüm çekilir ve semver karşılaştırması yapılır
(string değil, sayısal parça parça).

Sessizce güncelleme yapılmaz. Yeni sürüm varsa üç seçenekli, kullanıcı kapatana
kadar duran bir bildirim gösterilir:

- **Şimdi güncelle** → Güncelleme sekmesini açar
- **Sonra hatırlat** → bildirimi kapatır, sonraki kontrolde tekrar çıkar
- **Bu sürümü atla** → o sürüm için bir daha uyarmaz

Sürüm notundaki `Discord build 400000-410000 ile test edildi` satırı ayrıştırılıp
Güncelleme sekmesinde gösterilir (plan §10.2).

## Ayarlar

| Ayar | Tür | Varsayılan | Açıklama |
|---|---|---|---|
| `checkOnStartup` | BOOLEAN | `true` | Açılışta kontrol et |
| `checkIntervalHours` | SLIDER | `6` | Kaç saatte bir (0 = sadece açılışta) |

## Kapsam

İndirme, SHA-256 doğrulama ve `app.asar` değiştirme **Faz 9**'da (dağıtım)
tamamlanır. Bu plugin şu an kontrol + bildirim + sürüm sayfasına yönlendirme
yapar.

## requiresRestart

`false`.
