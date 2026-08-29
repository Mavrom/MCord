# NoTrack

Discord'un telemetri, analitik ve hata raporlama çağrılarını engeller.

**Varsayılan olarak açıktır** — ürün duruşunun bir parçası (plan §0.3).

## Nasıl çalışır

Üç ayrı kanal kapatılır, hepsi fonksiyon patch'i ile (kod patch'i yok):

1. **Analitik** — `AnalyticsActions.track` / `trackWithMetadata` `instead` ile yutulur.
2. **Science** — kullanım ölçüm olayları (`submitLiveEvent`) yutulur.
3. **Sentry** — global `__SENTRY__` hub'ı devre dışı bırakılır ve scope temizlenir.

Sentry ayrı bir webpack instance'ında çalıştığı için zaten yakalama aşamasında
kara listededir (plan §4.1); burada yapılan iş yalnızca global hub'ı susturmak.

## Ayarlar

| Ayar | Tür | Varsayılan | Açıklama |
|---|---|---|---|
| `blockAnalytics` | BOOLEAN | `true` | `track` çağrılarını engelle |
| `blockSentry` | BOOLEAN | `true` | Sentry'yi devre dışı bırak |
| `blockScienceEvents` | BOOLEAN | `true` | Kullanım ölçüm olaylarını engelle |

## Notlar

- Engellenen çağrı sayısı plugin durdurulduğunda konsola yazılır.
- MCord kendisi hiçbir telemetri toplamaz; bu plugin yalnızca **Discord'un**
  telemetrisini hedefler.

## Reporter testi

`findByKeys("track", "trackWithMetadata")` ve `byKeys(["submitLiveEvent"])`
aramaları reporter'ın **Bad Webpack Finds** doğrulamasına girer.
