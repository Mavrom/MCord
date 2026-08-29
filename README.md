# MCord

Windows üzerindeki Discord masaüstü istemcisine enjekte olan, **küratörlü** bir
istemci modu. Özellik kütüphanesi tamamen kendi bünyemizde geliştirilir; üçüncü
parti plugin kurulumu, tema sistemi ve kullanıcı CSS'i bilinçli olarak yoktur.

Hedef: kurulur, çalışır, Discord güncellemelerinde bozulmaz, RAM yemez,
çöktüğünde kendini toparlar.

---

## ⚠️ Uyarı

MCord bir **istemci modudur** ve Discord'un Kullanım Şartları'na aykırıdır.
Hesap askıya alma pratikte nadirdir ama olasılığı sıfır değildir. Bunu bilerek
kullanın.

---

## Duruş

- Kaynak kodu görünür (PolyForm Strict 1.0.0 — tüm hakları saklı, kopyalanamaz/türetilemez)
- Telemetri yok, analitik yok, uzak sunucuya hiçbir kullanıcı verisi gitmiyor
- Discord'un kendi telemetrisi varsayılan olarak engelleniyor
- Özellik kısıtlaması yok — plugin ne yapıyorsa kullanıcı görüyor ve kapatabiliyor
- Kilitli/premium katman yok

## Kapsam

| Var | Yok |
|---|---|
| Windows (Stable / PTB / Canary) | Linux, macOS |
| Küratörlü, repo içi plugin kütüphanesi | Üçüncü parti plugin kurulumu, Addon Store |
| Plugin başına tip güvenli ayarlar | Kullanıcı CSS / QuickCSS, tema sistemi |
| Çökme kurtarma ve güvenli mod | Bulut ayar senkronizasyonu |
| Otomatik güncelleme (SHA256 doğrulamalı) | Tarayıcı eklentisi / userscript |

## Kurulum

[Releases](https://github.com/Mavrom/MCord/releases) sayfasından
`MCordInstaller.exe` indir ve çalıştır. Yönetici hakkı gerekmez.

Kaldırmak için aynı dosyayı `--uninstall` ile çalıştır.

Yayınlanan her dosyanın SHA-256 özeti `SHA256SUMS.txt` içinde; güncellemeler de
uygulanmadan önce özetle doğrulanır.

## Geliştirme

```bash
pnpm install
pnpm watch      # esbuild watch, dev build
pnpm inject     # geliştirme derlemesini yerel Discord'a enjekte et
pnpm typecheck  # tsc --noEmit
pnpm lint
pnpm test
```

Reporter (patch doğrulama):

```bash
pnpm buildReporter
pnpm generateReport
```

Dağıtım paketi:

```bash
pnpm dist
```

## Lisans

Telif hakkı © 2026 Mavrom. Tüm hakları saklıdır.

MCord, [PolyForm Strict License 1.0.0](https://polyformproject.org/licenses/strict/1.0.0)
ile kaynağı görünür (source-available) olarak sunulur. Yazılımı yalnızca izin
verilen amaçlarla çalıştırabilirsiniz; Mavrom'dan ayrı yazılı izin almadan
kopyalayamaz, dağıtamaz, yayımlayamaz veya değiştirilmiş/türetilmiş çalışmalar
üretemezsiniz. Tam metin: [LICENSE](LICENSE).
