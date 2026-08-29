# SupportInfo

Destek isterken paylaşılacak tanılama bilgisini üretir.

**Çekirdek plugin** — `required: true`.

## Nasıl çalışır

Patch kullanmaz. `/mcord-destek` komutunu kaydeder (CommandsAPI bağımlılığı).

Üretilen bilgi panoya kopyalanır; komuta `gonder: true` verilirse mesaj olarak
gönderilir.

## Toplanan bilgi

Hiçbir kullanıcı verisi yoktur (plan §0.3). Yalnızca:

- MCord sürümü, commit hash, build zamanı
- Discord build numarası ve `app-*` klasörü (enjeksiyon güncel mi)
- Electron / Chrome sürümleri
- Yüklü modül sayısı, uygulanmamış kod patch'i sayısı
- Güvenli mod durumu
- Etkin plugin listesi

Kullanıcı adı, sunucu, kanal, mesaj, token gibi hiçbir veri yer almaz.

## requiresRestart

`false`.
