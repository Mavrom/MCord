# webpack/common Buildout — Tasarım

**Tarih:** 2026-09-07
**Amaç:** MCord'un webpack modül kataloğunu referans katalog seviyesine çıkarmak. Bugün
ExpressionCloner `RestAPI`'yi bulamadığı için tıkandık; kök sebep MCord'un
`webpack/common`'unda ~15 hazır modül olması, referans katalog'da ~80.

## Yaklaşım

Finder tanımları için kanıtlanmış, canlı Discord'a karşı çalışan imzalar kullan. Kendi
imza tahmini yapma.
Yapı: `src/webpack/common/` altında dosyalar
(`stores.ts`, `utils.ts`, `components.ts`, `menu.ts`, `modals.ts`), hepsi
`webpack/common/index.ts`'ten re-export.

Dayanıklılık sırası (aynı şeyi iki türlü bulabiliyorsak):
`findStoreLazy(ad)` > `byKeys(props)` > `mapMangledModuleLazy` > `componentByCode`.

## Kapsam — Faz 1 (bu spec)

### `webpack/common/stores.ts`
Discord'un tüm Flux store'ları (ada göre): `GuildMemberStore`,
`EmojiStore`, `StickersStore`, `DraftStore`, `WindowStore`, `ReadStateStore`,
`PresenceStore`, `SessionsStore`, `TypingStore`, `ThemeStore`,
`GuildChannelStore`, `SelectedGuildStore`, `EmojiDisabledReasons`, ... (mevcut
8 store'u da buraya taşı, `common.ts`'ten kaldır).

### `webpack/common/utils.ts`
- `RestAPI` — `findLazy(m => typeof m === "object" && m.del && m.put)` **+**
  MCord'da bugün gördüğümüz sorun: bu SuperAgent'ı da yakalıyor. Ek ayraç:
  gerçek RestAPI'nin `getAPIBaseURL`'i yok ama metotları `a(i.Bo.get,...)`
  sarmalayıcı. Filtreyi `m.del && m.put && !String(m.get).includes("native code")`
  yap; SuperAgent'ın metotları bind'li (`[native code]`).
- `Constants` — `mapMangledModuleLazy('ME:"/users/@me"', { Endpoints, ... })`
- `PermissionsBits` — `findLazy(m => typeof m.ADMINISTRATOR === "bigint")`
- `SnowflakeUtils`, `moment`, `lodash`, `Alerts`, `Toasts` (referans katalog'daki obje),
  `IconUtils`, `UsernameUtils`, `ChannelActionCreators`, `ExpressionPickerStore`,
  `NavigationRouter` (mevcut olan güncellensin), `SettingsRouter`
- discord helpers (`webpack/common` değil `utils/discord.ts`):
  `getCurrentGuild`, `getCurrentChannel`, `getGuildAcronym`, `hasGuildFeature`,
  `sendMessage`, `insertTextIntoChatInputBox`, `getIntlMessage`

### `webpack/common/menu.ts`
referans katalog `menu.ts`: `Menu` (`MenuItem`, `MenuGroup`, `MenuSeparator`,
`MenuCheckboxItem`, `MenuRadioItem`, `MenuControlItem`), `ContextMenuApi`.
**+** `api/contextMenu.ts`'e `findGroupChildrenByChildId` ekle (referans katalog `@api/ContextMenu`).

### `webpack/common/modals.ts`
Modal katmanı: `ModalRoot`, `ModalHeader`, `ModalContent`, `ModalFooter`,
`ModalCloseButton`, `ModalSize`, `openModal`, `openModalLazy`, `closeModal`,
`closeAllModals`.

### `webpack/common/components.ts`
Faz 1'de sadece kritik olanlar: `Button`, `Switch`, `TextInput`, `Select`,
`Slider`, `Forms` (`FormText`, `FormTitle`, `FormSection`, `FormDivider`),
`Text`, `Tooltip` (Discord), `Card`, `Clickable`. Gerisi Faz 2.

## Doğrulama

MCord'da reporter var (`debug/reporter.ts` `findBadWebpackFinds`) ama sadece
CI/Puppeteer'da çalışıyor. Client'ta da çalışsın:
- `webpack/lazy.ts` `record()` her build'de geçmişi tutsun (şu an `IS_REPORTER`
  şartlı).
- Açılışta `onceReady` sonrası kısa bir gecikmeyle tüm kayıtlı lazy aramaları
  çalıştır, `null` dönenleri `console.warn("[MCord] kırık finder'lar:", [...])`
  bas.
- Kullanıcı o listeyi bir kez paylaşır → sadece kırıkları düzeltiriz.

## Kapsam dışı (Faz 2/3, ayrı spec)
Kalan tüm UI bileşenleri (`Avatar`, `Popout`, `ScrollerThin`, `Timestamp`,
`SearchableSelect`, `TextArea`, `Checkbox`, `MaskedLink`, `TabBar`, `FocusLock`),
`Parser`, `useStateFromStores`, `hljs`, `ComponentDispatch`, `UploadHandler`.
Reporter'ı düzenli CI'da çalıştırmak (`DISCORD_TOKEN` secret'ı gerekiyor).

## Riskler
- referans katalog `dev` finder'ları user'ın Discord sürümüyle birebir olmayabilir →
  reporter self-check bunu tek turda yakalar.
- `webpack/common.ts` → `webpack/common/` klasörüne taşıma; mevcut `common.ts`
  import'ları kıracak → tüm `from "../../webpack/common"` yolları klasör
  index'ine bakacak şekilde barrel bırak (`common.ts` → `common/index.ts` yeniden
  export). Aslında `common.ts`'i `common/index.ts` yapmak en temizi.
- `mapMangledModuleLazy` string/regex imzaları en kırılgan kısım — reporter
  bunları da doğruluyor.
