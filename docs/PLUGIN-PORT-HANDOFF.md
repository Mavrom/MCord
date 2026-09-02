# MCord — Plugin Port Devam Notu (Codex için)

## 2026-09-02 — MessageLogger ve VcNarrator değişikliği

- VcNarrator, sahibinin isteğiyle MCord kaynaklarından kaldırıldı. Aşağıdaki
  tarihsel Vencord kataloğunda bulunması MCord'da kurulu olduğu anlamına gelmez.
- MessageLogger artık komut değildir: silme ve düzenleme MessageStore sınırında
  ele alınır; silinen mesaj yerinde kalır, geçmiş yalnızca yerel arayüzde açılır.
  Önceki komut kaydı ve genel Flux silme olayını yutma yaklaşımı kaldırıldı.
- Güncel davranış, sınırlar ve Vencord referansı `src/plugins/messageLogger/README.md` içindedir.

Bu dosya, MCord'a Vencord tarzı plugin kütüphanesi kazandırma işinin **kaldığı
yerden devam edebilmesi** için yazıldı. Soğuktan başlayan bir ajanın bu dosyayı
okuyup doğrudan çalışmaya devam edebilmesi hedeflendi.

> Bağlam: Repo sahibi Windows'ta `C:\Users\Berk\Desktop\MCord` altında çalışıyor.
> `pnpm@11.24.0`, Node 20+. Paket yöneticisi sorun çıkarırsa `npm i -g pnpm@11.24.0`.

---

## ⇢ Codex'e verilecek prompt (bunu yapıştır)

> MCord projesinde çalışıyorsun: `C:\Users\Berk\Desktop\MCord` (Windows,
> pnpm@11.24.0, Node 20+). MCord, Windows Discord istemcisine enjekte olan,
> Vencord mimarisinde bir istemci modu.
>
> **İlk iş:** Bu dosyanın (`docs/PLUGIN-PORT-HANDOFF.md`) tamamını oku — bağlam,
> kurallar, framework kullanımı, mevcut 102 plugin'in durumu, eksik API'ler,
> öncelik sırası ve tüm 167 Vencord plugini eşleme referansı burada.
>
> **Değişmez kurallar (§0):** (1) Commit'lerde `Co-Authored-By` EKLEME; plugin
> `authors:` sadece `Devs.Berk`; hiçbir yerde AI atfı yok. (2) Vencord kaynağını
> KOPYALAMA — davranışı oku, MCord API'siyle sıfırdan yaz; lisans sahibinin işi,
> bunu gerekçe gösterip durma. (3) Arama/patch tutmazsa plugin `logger.warn`
> basıp no-op olmalı, Discord'u asla bozmamalı.
>
> **Görev sırası:** (1) §2'deki "B grubu" SCAFFOLD plugin'leri `pnpm inject` +
> Discord DevTools ile doğrula, tutmayan seçici/aramaları düzelt. (2) §6'daki
> "kolay gerçek port'lar"dan yeni plugin ekle (hedef: 167'ye yaklaşmak).
> (3) §5'teki eksik API'leri yaz, sonra UI-ağırlıklı plugin'lere geç.
>
> **Her batch sonrası:** `pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm smoke` — hepsi yeşil olmalı.
>
> **Commit:** Sahibi söyleyene kadar commit atma. Attığında `Co-Authored-By`
> yok, kısa Türkçe mesaj, `main` dalı.
>
> Başla: önce bu dosyayı oku, sonra mevcut plugin'lerden 3-5 tanesini
> `pnpm inject` ile canlı test edip rapor ver.

---

## 0. Değişmez kurallar

1. **Atıf yok.** Commit'lerde `Co-Authored-By` trailer'ı **ekleme**. Plugin
   `authors:` alanında yalnızca `Devs.Berk` kullan. AI/asistan kimliği hiçbir
   yerde görünmesin. Commit kimliği mevcut git kullanıcısı (Mavrom) olsun.
2. **Lisans repo sahibinin sorunu.** Vencord GPL-3.0, MCord PolyForm-Strict.
   Vencord kaynak kodunu **kopyalama** — davranışı oku, MCord API'siyle
   sıfırdan (clean-room) yaz. Repo sahibi ayrıca temizlik yapacak; bunu
   gerekçe göstererek işi durdurma.
3. **Güvenli mod ilkesi.** Bir webpack araması / patch tutmazsa plugin
   `logger.warn` basıp **no-op** olmalı — asla exception fırlatıp Discord'u
   bozmamalı. Mevcut `start()` gövdeleri `try/catch` içinde.
4. **Kapsam sınırı (MCord duruşu).** Üçüncü parti plugin kurulumu, tema
   sistemi, QuickCSS/kullanıcı CSS'i **yok**. `usrbg`, `clientTheme`,
   `fakeProfileThemes`, `themeAttributes`, `shikiCodeblocks` gibi Vencord
   plugin'leri bu duruşa aykırı — **port etme**.

---

## 1. Durum (bugün)

- **102 kullanıcı plugini** var (`src/plugins/` altında `_` ile başlamayanlar).
  Başlangıçta 7 vardı; bu oturumda +95 eklendi.
- Hepsi derleniyor: `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm smoke`,
  `pnpm test` (80 test) → **hepsi yeşil**.
- **Hiçbiri canlı Discord'da doğrulanmadı.** Aşağıdaki "güven seviyesi"
  tablosuna bak.

### Bu oturumda düzeltilen Windows build hataları (korunmalı)

| Dosya | Sorun |
|---|---|
| `scripts/build/common.mjs` | `makeAllPackagesExternalPlugin` regex'i Windows mutlak yolunu paket sanıyordu → build hiç çalışmıyordu. `args.kind === "entry-point" \|\| isAbsolute(...)` ile atlanıyor. |
| `scripts/smokeTest.mjs` | `.replaceAll("\\\\","/")` tek ters bölüyü kaçıramıyor → stub'a geçersiz unicode kaçışı. `JSON.stringify(...)` ile gömülüyor. |
| `.gitattributes` (yeni) | `core.autocrlf` CRLF'i `simple-header` shebang regex'ini bozuyordu. `* text=auto eol=lf`, çalışma ağacı LF'e çevrildi. |

---

## 2. Güven seviyesi — mevcut 102 plugin

### A. Muhtemelen çalışır (Discord iç yapısına dokunmuyor)

- **Komutlar** (`CommandsAPI`, deterministik): moreCommands, roll, coinFlip,
  eightBall, textTools, uwuify, timestamp, choose, ratewaifu, sarcasm, owoify,
  shrugCmd, disappointed(shrugCmd)
- **Komutlar (fetchJson, ağ gerektirir)**: catCommand, dogCommand, foxCommand,
  dadJoke, catFact, urbanDictionary
- **Giden mesaj metni** (`MessageEventsAPI.onBeforeMessageSend`): clearURLs
  (testli), unindent (testli), silentMessage, textReplace (mevcuttu)
- **Bağlam menüsü** (`ContextMenuAPI`): copyUserMention, copyChannelLink,
  copyMessageText, copyGuildId
- **DOM / flux**: oneko, moyai, keepCurrentChannel

### B. SCAFFOLD — canlı doğrulama şart (CSS seçicileri veya patch noktaları tahmini)

- **CSS-only** (59 adet: `noMosaic`, `plainFolderIcon`, `hideChatButtons`,
  `squareAvatars`, `thinScrollbars`, `noTextShadow`, `compactChannelList` …):
  hepsi `managedStyle` ile stylesheet enjekte eder. Discord'un class adları
  hash'li; `[class*="foo_"]` alt-string seçicileri kullanıldı ama **doğrulanmadı**.
  Yanlış seçici = görünür etki yok, zarar yok. Her birini Discord DevTools ile
  kontrol et.
- **Davranış/patch** (`disableCallIdle`, `noBlockedMessages`,
  `noDefaultHangStatus`, `noMirroredCamera`, `showHiddenThings`, `volumeBooster`,
  `noReplyMention`, `noDevtoolsWarning`): `findByKeys(...)` aramaları ve patch
  imzaları **tahmini**. `start()` içinde dosya başındaki JSDoc "SCAFFOLD" notu
  var. Modül adları/metod imzaları canlı Discord'da doğrulanmalı.

**Öncelik:** B grubunu ya doğrula ya da yeniden yaz. A grubu muhtemelen dokunmadan
geçer ama yine de bir kez elden geçir.

---

## 3. Plugin nasıl yazılır (MCord framework)

Referans örnekler — bunları oku:
`src/plugins/silentTyping/index.tsx` (patch + chatBarButton),
`src/plugins/textReplace/` (onBeforeMessageSend + ayrı test edilen saf modül),
`src/plugins/showHiddenChannels/index.ts` (store `.after` patch),
`src/plugins/pinDMs/index.ts` (contextMenu + store patch).

### Dosya düzeni

```
src/plugins/<camelCaseAd>/
  index.ts          # veya index.tsx (JSX döndürüyorsa)
  <saf-mantik>.ts   # test edilebilir saf fonksiyonlar (varsa)
  <saf-mantik>.test.ts
  README.md         # kısa; zorunlu değil ama repo geleneği
```

`scripts/build/common.mjs` içindeki `globPlugins`, `src/plugins/` (ve
`_api`, `_core`) altındaki `_` ile başlamayan her klasörü **otomatik** bulur.
`name:` özelliği **ilk özellik ve düz string literal** olmak zorunda (build
regex'i oradan okuyor).

### Zorunlu dosya başlığı (eslint `simple-header`)

```
/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */
```

### definePlugin alanları (`src/utils/types.ts`)

`name, description, authors, tags?, dependencies?, required?, enabledByDefault?,
startAt?, start?(), stop?(), patches?, flux?, contextMenus?, commands?,
managedStyle?, onBeforeMessageSend?, onBeforeMessageEdit?, onMessageClick?,
chatBarButton?, renderMessageDecoration?, settings?, requiresRestart?`

- `startAt`: `StartAt.Init | WebpackReady (varsayılan) | DOMContentLoaded | ConnectionOpen`
- `this.patcher.after/before/instead(obj, "method", fn)` — plugin durunca
  framework geri alır. Kod (string) patch'lerinde `reason` **zorunlu**
  (eslint `mcord/require-patch-reason`).
- `dependencies`: API plugin adları — `"CommandsAPI"`, `"MessageEventsAPI"`,
  `"ContextMenuAPI"`, `"ChatComponentsAPI"`, `"MemberListDecoratorsAPI"`,
  `"ServerListAPI"`, `"NoticesAPI"`, `"BadgesAPI"`, `"MessageUpdaterAPI"`,
  `"UserSettingsAPI"`.

### Ayarlar

```ts
import { definePluginSettings } from "../../api/settings";
import { OptionType } from "../../utils/types";

const settings = definePluginSettings({
    foo: { type: OptionType.BOOLEAN, description: "...", default: true },
    bar: { type: OptionType.SELECT, description: "...", options: [{ label: "A", value: "a", default: true }] }
});
// erişim: settings.store.foo
// UI'da gizli ayar: `hidden: true` (SettingControls bunu filtreliyor)
// definition'da olmayan anahtara YAZAMAZSIN (proxy reddediyor) — hidden setting kullan
```

### Webpack bulucular (`src/webpack/finder.ts`, `src/webpack/common.ts`)

`findByKeys("a","b")`, `findByStrings(...)`, `findBySource(...)`,
`findStore("UserStore")`, `find(byKeys([...]), { silent: true })`,
`findByCodeLazy(...)`. Hazır ortak modüller `common.ts`'de:
`FluxDispatcher/getFluxDispatcher()`, `UserStore`, `ChannelStore`,
`SelectedChannelStore`, `GuildStore`, `MessageStore`, `PermissionStore`,
`RelationshipStore`, `MessageActions`, `SettingsRouter`, `ContextMenuApi`.

React: `import { React } from "../../webpack/react";` (erişildiğinde çözülen proxy).

### Komut dönüşü

`execute(args, ctx)` → `{ content: "..." }` döndürürsen Discord metni kutuya
yazıp gönderir (`inputType` varsayılan `BUILT_IN_TEXT`). `findOption(args, "name", fallback)`.
**Not:** MCord'da henüz `sendBotMessage` (efemer bot yanıtı) yok — bkz. §5.

---

## 4. Doğrulama (her batch sonrası çalıştır)

```bash
pnpm typecheck        # tsc --noEmit
pnpm lint             # eslint  (pnpm lint:fix çoğu şeyi düzeltir)
pnpm test             # vitest — saf mantık modülleri için test ekle
pnpm build            # esbuild üretim
pnpm smoke            # main process açılış garantisi (A/B/C senaryo)
```

Canlı test:
```bash
pnpm watch            # dev build + izle
pnpm inject           # yerel Discord'a enjekte  (Discord kapalı olmalı)
pnpm uninject         # geri al
```

Eslint kuralları özet: 4 boşluk girinti, çift tırnak, noktalı virgül **var**,
sonda virgül **yok**, `simple-import-sort` (dış → iç, alfabetik; tip importları
satır içi `type`), dosya sonunda newline, `no-trailing-spaces`.

---

## 5. Eksik altyapı (API) — plugin'den ÖNCE yazılması gerekenler

Repo sahibinin planı: **önce plugin sayısını artır, sonra (gece) altyapıyı
167'ye taşı.** Aşağıdaki API'ler birçok Vencord plugin'i için ön koşul:

| Eksik API / yardımcı | Ne için gerekli | Vencord karşılığı |
|---|---|---|
| `MessagePopoverAPI` | Mesaj hover araç çubuğuna düğme | `viewRaw`, `quickReply`, `revealAllSpoilers`, `translate`, `whoReacted`, `showAllMessageButtons` |
| `MessageAccessoriesAPI` | Mesajın altına içerik | `messageLinkEmbeds`, `translate`, `dearrow` |
| `MessageDecorationsAPI` | Yazar adı yanına rozet/etiket | `platformIndicators`, `mentionAvatars`, `userMessagesPronouns`, `showMeYourName` |
| `sendBotMessage` / efemer yanıt | Komut çıktısını sadece sana göster | tüm bilgi komutları (`urban`, `serverInfo`, `translate`…) |
| `openModal` + Modal bileşenleri | Ayar/bilgi pencereleri | `permissionsViewer`, `serverInfo`, `viewIcons`, `reviewDB` |
| Ortak bileşenler (`Button`, `Forms`, `Text`, `Flex`, `Switch`, `Menu.*`) | Her UI plugin'i | çoğu |
| `useSettings()` / reaktif ayar hook'u | UI'ın ayar değişiminde güncellenmesi | çoğu UI plugin'i |
| `Constants` / `RestAPI` sarmalayıcı | Discord REST çağrıları | `friendInvites`, `reverseImageSearch`, `serverInfo` |
| `ChatInputButtonAPI` genişletme | Şu an tek `chatBarButton` var; çoklu/sıralı düğme | `silentMessage`, `previewMessage`, `gifPaste` |
| `PresenceStore` / `SessionsStore` erişimi | Platform/aktivite göstergeleri | `platformIndicators`, `ignoreActivities` |

---

## 6. Sıradaki iş — öncelik sırası

1. **B grubunu doğrula** (§2). `pnpm inject` + Discord DevTools ile CSS
   seçicilerini ve `findByKeys` aramalarını kontrol et; tutmayan seçicileri
   düzelt veya plugin'i sil.
2. **Kolay gerçek port'lar** (yeni API gerektirmeyen, Vencord'da var olan):
   `characterCounter` (chatBar), `alwaysExpandRoles` (CSS/patch),
   `betterRoleDot` (CSS + context menu), `copyUserURLs` / `copyFileContents` /
   `copyEmojiMarkdown` / `copyStickerLinks` (contextMenu),
   `dontRoundMyTimestamps` (patch), `noUnblockToJump` (patch),
   `noOnboardingDelay` (patch), `noPendingCount` (patch/CSS),
   `loadingQuotes` (patch), `friendInvites` (command + RestAPI),
   `readAllNotificationsButton` (ServerListAPI + dispatch),
   `memberCount` (patch/decorator), `serverListIndicators` (ServerListAPI),
   `messageClickActions` (`onMessageClick`), `quickMention` (contextMenu),
   `iLoveSpam` (patch), `noServerEmojis` (patch), `favEmojiFirst` (patch),
   `implicitRelationships` (RelationshipStore patch),
   `gameActivityToggle` / `ignoreActivities` (patch).
3. **API yaz** (§5) → sonra UI-ağırlıklı plugin'ler:
   `viewRaw`, `translate`, `typingIndicator`, `typingTweaks`,
   `platformIndicators`, `showMeYourName`, `reverseImageSearch`,
   `mentionAvatars`, `roleColorEverywhere`, `serverInfo`, `permissionsViewer`,
   `spotifyControls`, `messageLinkEmbeds`, `revealAllSpoilers`, `whoReacted`.
4. **Port ETME** (§0.4): `usrbg`, `clientTheme`, `fakeProfileThemes`,
   `themeAttributes`, `shikiCodeblocks`, `reviewDB` (uzak sunucu),
   `decor` (uzak sunucu), `dearrow` (uzak sunucu — tartışmalı),
   `customRPC`/`arRPC` (harici köprü — sahibiyle konuş).

### Tüm Vencord plugin listesi (167) — eşleme referansı

```
accountPanelServerProfile alwaysAnimate alwaysExpandRoles alwaysTrust
anonymiseFileNames appleMusic arRPC autoDndWhilePlaying betterFolders
betterGifAltText betterGifPicker betterRoleContext betterRoleDot betterSessions
betterSettings* betterUploadButton biggerStreamPreview blurNsfw callTimer
characterCounter clearURLs* clientTheme(X) colorSighted consoleJanitor
consoleShortcuts copyEmojiMarkdown copyFileContents copyStickerLinks copyUserURLs
crashHandler customCommands customIdle customRPC dearrow(X) devCompanion
disableCallIdle* dontRoundMyTimestamps experiments expressionCloner f8break
fakeNitro fakeProfileThemes(X) favEmojiFirst fixCodeblockGap fixImagesQuality
fixSpotifyEmbeds fixYoutubeEmbeds forceOwnerCrown friendInvites fullSearchContext
fullUserInChatbox gameActivityToggle gifPaste greetStickerPicker hideAttachments
iLoveSpam ignoreActivities imageFilename imageLink imageZoom implicitRelationships
ircColors keepCurrentChannel* loadingQuotes memberCount mentionAvatars
messageClickActions messageLatency messageLinkEmbeds messageLogger* moreQuickReactions
musicRichPresence mutualGroupDMs newGuildSettings noBlockedMessages* noDeepLinks
noDevtoolsWarning* noF1 noMaskedUrlPaste noMiddleClickPaste noMosaic* noOnboardingDelay
noPendingCount noProfileThemes noReplyMention* noServerEmojis noSystemBadge
noTypingAnimation noUnblockToJump notificationVolume onePingPerDM oneko*
openInApp overrideForumDefaults pauseInvitesForever permissionFreeWill
permissionsViewer petpet pictureInPicture pinDms* plainFolderIcon* platformIndicators
previewMessage quickMention quickReply reactErrorDecoder readAllNotificationsButton
relationshipNotifier replaceGoogleSearch replyTimestamp revealAllSpoilers
reverseImageSearch reviewDB(X) roleColorEverywhere secretRingTone seeSummaries
sendTimestamps serverInfo serverListIndicators shikiCodeblocks(X) showAllMessageButtons
showConnections showHiddenChannels* showHiddenThings* showMeYourName showTimeoutDuration
silentMessageToggle* silentTyping* sortFriendRequests spotifyControls spotifyCrack
spotifyShareCommands startupTimings stickerPaste streamerModeOnStream
superReactionTweaks tenorGifSearch textReplace* themeAttributes(X) translate
typingIndicator typingTweaks unindent* unlockedAvatarZoom unsuppressEmbeds
userMessagesPronouns userVoiceShow usrbg(X) validReply validUser vcDoubleClick
vcNarrator vencordToolbox viewIcons viewRaw voiceDownload voiceMessages
volumeBooster* webContextMenus webKeybinds webPWA webScreenShare webScreenShareFixes
whoReacted xsOverlay youtubeAdblock
```

`*` = MCord'da bir karşılığı var (bazıları SCAFFOLD). `(X)` = §0.4 gereği port edilmeyecek.

---

## 7. Commit / push

- Sahibi hazır olduğunu söyleyene kadar commit atma; attığında:
  - `Co-Authored-By` **yok**
  - kısa Türkçe commit mesajı (mevcut geçmişe bak: `git log --oneline`)
  - `main` üzerinde çalışılıyor (repo `main`'i doğrudan kullanıyor)
- Push öncesi: `pnpm lint && pnpm typecheck && pnpm test && pnpm smoke`
