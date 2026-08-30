# UserSettingsAPI

Plugin'lerin **Discord'un kendi ayarlarını** okuyup değiştirmesini sağlar (bizim
plugin ayarlarımız değil — Discord'un `UserSettingsProtoStore` ayarları).

**Altyapı plugin'i** ama `required: true` DEĞİL. Kullanan plugin
`dependencies: ["UserSettingsAPI"]` bildirince `PluginManager` otomatik
etkinleştirir. Discord'un ayar tarama modülünü gereksiz yere patch'lememek için
varsayılan kapalı.

## Nasıl çalışır

Discord her ayarı `{getSetting, updateSetting, useSetting}` şeklinde tek bir
üretici fonksiyonla kuruyor ama sonuca hangi grup/isimden geldiğini yazmıyor →
iki adımlı kod patch'i.

Çapa `"textAndImages","renderSpoilers"` (bundle'da tek). Grup patch'i:

1. Üretici fonksiyonun grup/isim parametrelerini çakışması imkânsız isimlerle
   (`$mcordGroup`, `$mcordName`) yakala.
2. Döndürülen nesneye bu çifti ekle (`mcordGroup`, `mcordName`).

## API

```ts
getUserSetting("textAndImages", "renderSpoilers")   // { getSetting, updateSetting, useSetting } | undefined
getUserSettingLazy("textAndImages", "renderSpoilers")   // lazy proxy
```

## requiresRestart

`true` (kod patch'i).
