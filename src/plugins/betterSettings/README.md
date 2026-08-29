# BetterSettings

Discord'un kendi ayarlar menüsünü sadeleştirir.

## Nasıl çalışır

Plan §6.6 bu plugin'i "kod patch'i gerektirenler" grubuna koymuştu; uygulamada
üç özelliğin de fonksiyon patch'i veya plugin-managed stil ile çözülebildiği
görüldü, dolayısıyla **kod patch'i yok** (plan §5.1: kod patch'i sadece fonksiyon
patch'inin yetmediği yerde).

| Özellik | Yöntem |
|---|---|
| Bölüm gizleme | Ayar bölümü listesine `after` patch'i, filtreleme |
| Son bölümü hatırlama | `setSection` `after` + `open` `before` patch'i |
| Animasyon kapatma | `managedStyle` (plugin'e ait sabit CSS, kullanıcı CSS'i değil) |

`managedStyle` `PluginManager` tarafından başlatmada enjekte edilir, durdurmada
kaldırılır (plan §6.5 simetri kuralı).

## Ayarlar

| Ayar | Tür | Varsayılan | Açıklama |
|---|---|---|---|
| `disableFade` | BOOLEAN | `true` | Ayarlar açılırken solma animasyonunu kapat |
| `rememberLastSection` | BOOLEAN | `true` | Son açılan bölümü hatırla |
| `hiddenSections` | STRING | `""` | Gizlenecek bölümler, virgülle ayrılmış |

Örnek: `hiddenSections = "nitro,billing,discord_nitro"`

## requiresRestart

`false` — kod patch'i olmadığı için (plan §7.3).

## Reporter testi

- `parseHidden()` saf fonksiyon: `src/plugins/betterSettings/parse.test.ts`
- `findByKeys("useDefaultUserSettingsSections")` ve `findByKeys("setSection")`
  aramaları reporter'ın **Bad Webpack Finds** doğrulamasına girer.
