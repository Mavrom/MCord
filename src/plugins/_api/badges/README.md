# BadgesAPI

Plugin'lerin kullanıcı profilindeki rozet satırına özel rozet eklemesini sağlar.

**Altyapı plugin'i** — `required: true`.

## Nasıl çalışır

Discord'un profil sınıfının `getBadges()` metodu rozet dizisini
`this._userProfile.badges` üzerinden kuruyor. Metot bir sınıf gövdesi içinde,
dışarıdan tutulabilir referansı yok → kod patch'i.

Çapa `getLegacyUsername(){` (aynı sınıf, bundle'da tek). Match `getBadges()`
gövdesindeki `return[` kalıbını yakalıyor, hemen ardına bizim rozetlerimizi
yayıyor (dizi başına).

Rozetler oradan Discord'un kendi render zincirine doğal yoldan akıyor: her rozet
`<img alt=" " src={badge.iconSrc}>` olarak, `description` ipucu metniyle çizilir.
**Ekstra render patch'i yoktur** — bu yüzden yalnızca resim-URL rozet desteklenir
(özel React bileşeni değil).

## API

```ts
addProfileBadge({
    id: "mcord-my-badge",          // benzersiz, mcord- ön eki önerilir
    description: "İpucu metni",
    iconSrc: "https://…/badge.png",
    link?: "https://…",
    shouldShow?: userId => true,
    position?: "start" | "end"
})
removeProfileBadge(badge)   // plugin stop()'ta
```

## requiresRestart

`true` (kod patch'i).
