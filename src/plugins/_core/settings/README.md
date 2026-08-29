# Settings

MCord ayar arayüzünü Discord'un ayarlar menüsüne ekler.

**Çekirdek plugin** — `required: true`, kapatılamaz.

## Nasıl çalışır

Discord'un ayar bölümü listesini üreten fonksiyona (`useDefaultUserSettingsSections`
veya `getUserSettingsSections`) `after` patch'i uygulanır ve dört sekmemiz eklenir:

1. **Pluginler** — arama, kategori filtresi, aç/kapa, otomatik ayar panelleri
2. **Genel** — pencere ayarları, güvenli mod, eager patch modu
3. **Güncelleme** — sürüm, changelog, atla
4. **Hakkında** — sürüm, Discord build, enjeksiyon durumu, lisans, uyarı

Kod patch'i yoktur (plan §5.1). Enjeksiyon başarısız olursa **Ctrl+Alt+M**
kısayolu ayarları bağımsız bir modalda açar — arayüz her koşulda erişilebilir.

Bildirim katmanı (`NotificationHost`) da bu plugin tarafından mount edilir.

## Ayar UI'ı otomatik üretiliyor

Plugin başına ayar ekranı yazılmaz. `definePluginSettings` tanımından
`SettingsPanel` bileşeni otomatik olarak kontrol üretir (plan §7.1):
BOOLEAN, STRING, NUMBER, BIGINT, SELECT, SLIDER, COMPONENT.

`hidden` ve `disabled` alanları fonksiyon da olabilir — koşullu ayarlar için.

## requiresRestart

`false`.
