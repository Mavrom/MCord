# MCord Altyapı Buildout — Discord Bileşen/Modal/Util Kataloğu

**Tarih:** 2026-09-09
**Amaç:** MCord'un **kendi** `webpack/common` kataloğunu tam hale getirmek —
Button, Switch, Forms, Select, Modal'lar, Menu, Text, Clipboard, Parser vb.
Discord webpack primitifleri. Dış paket (referans katalog types vb.) YOK, uyum kabuğu
YOK. MCord'un kendi motoru, kendi modül yapısı, kendi isimlendirmesi.

Bunlar hazır olunca MCord'un depoda zaten olan plugin'leri ve sonradan
uyarlanacak port'lar tek yerden, sağlam bir zemine yaslanır.

## İlke

Finder **tanımlarını** referans katalog `main`'den al (canlı Discord'a karşı doğrulanmış),
ama **yapı ve isim MCord'un**. `src/webpack/common.ts` → `src/webpack/common/`
klasörü:

```
webpack/common/
  index.ts        — hepsini re-export
  stores.ts       — findStoreLazy'ler (mevcut ~25 buraya taşınır)
  utils.ts        — RestAPI, Constants, PermissionsBits, Toasts, Alerts,
                    Clipboard, Parser, ComponentDispatch, UploadHandler,
                    NavigationRouter, SettingsRouter, ExpressionPickerStore,
                    InviteActions, moment, lodash, hljs, useStateFromStores
  components.tsx  — Forms, Button, Switch, Checkbox, Select, SearchableSelect,
                    TextInput, TextArea, Slider, Card, Text, Tooltip (Discord),
                    TooltipContainer, Clickable, Avatar, Popout, Dialog,
                    Paginator, ScrollerThin, Heading, MaskedLink, Timestamp, Flex
  menu.tsx        — Menu namespace, ContextMenuApi (mevcut)
  modal.tsx       — openModal, openModalLazy, closeModal, closeAllModals,
                    ModalRoot, ModalHeader, ModalContent, ModalFooter,
                    ModalCloseButton, ModalSize, ModalTransitionState
  react.ts        — React, ReactDOM (webpack/react'ten) + useState/useEffect/
                    useMemo/useRef/useCallback/useReducer/useLayoutEffect
```

Dayanıklılık sırası: `findStoreLazy` > `findByPropsLazy` > `findComponentByCodeLazy`
> `mapMangledModuleLazy`. Hepsi lazy — erişilene kadar çözülmez; çözülmezse
`logger.warn` + `undefined`, plugin no-op olur, Discord kırılmaz.

## Ek parçalar

- **`src/components/ErrorBoundary.tsx`** — MCord'un kendi hata sınırı bileşeni.
  `ErrorBoundary.wrap(Component)` / `.wrap(fn, { noop: true })`. Plugin-içi
  kullanım (Recovery plugin'inden bağımsız).
- **`src/utils/discord.ts`** — `getCurrentGuild`, `getCurrentChannel`,
  `getGuildAcronym`, `getIntlMessage` (intlHash tabanlı), `openUserProfile`,
  `insertTextIntoChatInputBox`, `sendMessage`.
- **`src/webpack/lazy.ts`** — gerekirse `findComponentLazy`, `findExportedComponentLazy`
  (var), `waitForComponent`, `findComponentByFieldsLazy` ekle.

## Faz planı

- **Faz 1 (bu spec):** `common/` klasör dönüşümü + components.tsx + modal.tsx +
  menu.tsx + utils.ts genişleme + ErrorBoundary + utils/discord.ts.
  Çıktı: `pnpm typecheck && pnpm lint && pnpm test && pnpm build` temiz;
  mevcut 211 plugin bozulmadan derlenir.
- **Faz 2:** Kullanıcı referans katalog port'larını elden geçirirken çıkan eksikleri
  parti parti tamamla.

## Riskler

- Component finder'ları Discord build'ine göre kayabilir → lazy, no-op'a düşer.
- `common.ts` → `common/index.ts` taşıması: 40 plugin + api + components
  `../../webpack/common` import ediyor; klasör `index.ts` ile yol aynı kalır,
  kırılma yok.
- Bundle: sadece lazy proxy ekleniyor, kod değil.
