# MCord Installer

Windows için tek dosya kurulum aracı (plan §12).

## Kullanım

```
MCordInstaller.exe                      # etkileşimli kurulum
MCordInstaller.exe --uninstall          # kaldırma
MCordInstaller.exe --branch=stable --yes # etkileşimsiz
```

`--branch` değerleri: `stable`, `ptb`, `canary`.

## Ne yapıyor

1. `%LocalAppData%\Discord*\app-<sürüm>\resources` altındaki en yeni kurulumu bulur
   (Stable / PTB / Canary ayrı ayrı; birden fazlaysa hangisine kurulacağını sorar)
2. Discord çalışıyorsa **kullanıcı onayıyla** kapatır
3. `app.asar` → `_app.asar` yeniden adlandırır
4. MCord'un `app.asar`'ını yerine kopyalar
5. **Boyut ve SHA-256** doğrulaması yapar
6. İsteğe bağlı olarak Discord'u yeniden başlatır

Kaldırma: `_app.asar` varsa geri adlandırır, bizimkini siler. Geliştirme
enjeksiyonu (`resources/app/`) varsa o da temizlenir.

## Windows'a özel notlar (plan §12.2)

| Konu | Ele alınışı |
|---|---|
| `original-fs` | Tüm asar işlemleri `original-fs` üzerinden; `fs` asar'ı klasör gibi gösterir |
| Dosya kilidi | `tasklist` ile süreç kontrolü, `taskkill` ile onaylı kapatma, kapanma beklenir |
| Yönetici hakkı | **Gerekmiyor** — `%LocalAppData%` kullanıcı alanı, UAC istenmez |
| Birden fazla sürüm | Stable/PTB/Canary ayrı listelenir, seçim sorulur |
| Antivirüs | `app.asar` değiştirmek bazı AV'lerde alarm verir; release pipeline'ında code signing adımı var (sertifika varsa) |

## Paketleme

```bash
pnpm --filter mcord-installer package
```

`@yao-pkg/pkg` ile `dist/MCordInstaller.exe` üretir; `dist/app.asar` varlık
olarak gömülür.
