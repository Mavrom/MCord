# BetterSettings

Discord'un kendi ayarlar menüsünü sadeleştirir.

## Nasıl çalışır

Discord ayarlar menüsünü yeniden yazdı: bölüm listesi artık bir düğüm ağacı
(`buildLayout()` ile kurulan `$Root` → bölüm → kenar çubuğu öğesi → panel), açma
işi `openUserSettings(target)` ESM export'unda. Eski `useDefaultUserSettingsSections`
listesi ve `open`/`setSection` modülü yok; ikisi de çalışma zamanında
sarılamadığı için iki küçük kod patch'i gerekiyor.

| Özellik | Yöntem |
|---|---|
| Bölüm gizleme | Kod patch'i: ağacın genel kurucusunda (`.buildLayout().map`, Vencord'un Settings plugin'iyle aynı nokta) çocuk düğümler süzülüyor |
| Son bölümü hatırlama | Ayar gezinme store'u (`currentPanelKey`) dinleniyor; kod patch'i: modal render'ında `target` boşsa son panel veriliyor |
| Animasyon kapatma | `managedStyle` (plugin'e ait sabit CSS, kullanıcı CSS'i değil) |

`managedStyle` `PluginManager` tarafından başlatmada enjekte edilir, durdurmada
kaldırılır (plan §6.5 simetri kuralı).

Gizleme patch'i yalnız `hiddenSections` doluysa uygulanıyor; boşken Discord'un
kodu hiç değişmiyor. Geçersiz ya da gizlenmiş bir hedef gelirse Discord kendisi
hesap paneline (`account_panel`) düşüyor.

## Ayarlar

| Ayar | Tür | Varsayılan | Açıklama |
|---|---|---|---|
| `disableFade` | BOOLEAN | `true` | Ayarlar açılırken solma animasyonunu kapat |
| `rememberLastSection` | BOOLEAN | `true` | Son açılan paneli hatırla |
| `hiddenSections` | STRING | `""` | Gizlenecek bölümler, virgülle ayrılmış (yeniden başlatma gerekir) |

`hiddenSections` kısa ad (`nitro` → `nitro_section` + `nitro_sidebar_item`) ya da
tam anahtar (`gift_sidebar_item`) alır. Örnek: `billing` faturalandırma
bölümünün tamamını, `gift,premium_guild_subscriptions` yalnız o iki öğeyi
gizler. Hesap yolu (`user_section`, `account_sidebar_item`) hiç gizlenmez.

Bilinen anahtarlar: `profile`, `messaging_permissions`, `data_and_privacy`,
`notifications`, `clips`, `billing`, `nitro`, `premium_guild_subscriptions`,
`subscriptions`, `gift`, `app`, `appearance`, `accessibility`, `voice_and_video`,
`system`, `language_and_time`, `games_and_apps`, `connected_apps`,
`activity_privacy`, `registered_games`, `overlay`, `developer`, `experiments`,
`developer_options`, `utility`, `logout`.

## requiresRestart

`true` — kod patch'leri var (plan §7.3).

## Reporter testi

- `parseHidden()` / `isHiddenKey()` saf fonksiyon: `src/plugins/betterSettings/parse.test.ts`
- `bySource("currentPanelKey:void 0,", "scrollPositionSnapshots:new Map")`
  araması reporter'ın **Bad Webpack Finds** doğrulamasına girer; iki kod patch'i
  her taramada denenir.
