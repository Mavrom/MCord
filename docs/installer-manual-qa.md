# Installer — elle QA kontrol listesi

Pencere (GUI) için otomatik e2e yok; WebView2 gerçek bir masaüstü oturumu ister.
Sürüm öncesi Windows'ta elle geçilir.

## Ön koşul
- [ ] `pnpm dist && pnpm --filter mcord-installer package` → `dist/MCordInstaller.exe` var (~60 MB)
- [ ] Test makinesinde Discord (Stable) kurulu
- [ ] Discord kapalı

## Pencere
- [ ] Çift tıkla → ~520×660 koyu tema pencere açılır, yeniden boyutlanmaz
- [ ] "Discord kurulumları taranıyor…" kısa görünür, sonra dal listesi
- [ ] Kurulu dallar doğru sürüm + durum rozeti gösteriyor (`kurulu değil`)

## Kur
- [ ] Stable satırını seç → **Kur** → log satırları akıyor
      (Yedekleniyor → Kopyalanıyor → Boyut doğrulandı → SHA-256 doğrulandı)
- [ ] Sonuç ekranı: ✔ yeşil, KB, `sha256:` satırı
- [ ] `%LocalAppData%\Discord\app-*\resources\` içinde `_app.asar` oluştu,
      `app.asar` artık ~112 KB (MCord)
- [ ] **Discord'u başlat** → Discord açılır, MCord yüklü (ayarlar / güvenli mod görünür)

## Discord açıkken
- [ ] Discord'u aç, pencerede **Yeniden Kur** → log'da "Discord kapatılıyor…" →
      Discord kapanır → kurulum tamamlanır

## Onar / Kaldır
- [ ] Kurulu dalda **Onar** → yeniden kopyalar + doğrular, ✔
- [ ] **Kaldır** → `_app.asar` geri döner, `app.asar` orijinal boyutta,
      pencere dal listesine döner (`kurulu değil`)

## CLI
- [ ] `MCordInstaller.exe --branch=stable --yes` → sessiz kurar, çıkış kodu 0
- [ ] `MCordInstaller.exe --uninstall --yes` → geri yükler, çıkış kodu 0
- [ ] Discord kurulu değilken → anlaşılır mesaj, çıkış kodu 1

## SmartScreen (imzasız exe)
- [ ] İlk çift tıkla → "Windows bilgisayarınızı korudu" → **Ek bilgi → Yine de çalıştır** → araç açılır

## Pencere açılamazsa (fallback)
- [ ] WebView2 bozuk/yoksa: çift tıkla → konsolda "Pencere açılamadı — metin tabanlı
      kuruluma geçiliyor" → interaktif metin kurulumu çalışır → sonunda Enter bekler
- [ ] `%TEMP%\mcord-installer-hata.log` oluştu (hata detayı)
