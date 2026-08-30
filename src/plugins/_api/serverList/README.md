# ServerListAPI

Plugin'lerin sol sunucu şeridinin (guild nav) üstüne veya altına eleman (düğme,
ikon) eklemesini sağlar.

**Altyapı plugin'i** — `required: true`.

## Nasıl çalışır

Sunucu şeridi (`<nav aria-label=…>`) kaydırılabilir listeyi bir modül literali
içinde inline JSX children dizisi olarak kuruyor → kod patch'i.

Çapa `"guildsnav"` navigasyon kimliği (bundle'da tek). İki replacement, **grup
değil** (biri tutmazsa diğeri yine çalışır):

| Konum | Enjeksiyon noktası |
|---|---|
| `above` | home/DM düğme kümesinden sonra, guild ağacından önce |
| `below` | guild keşif düğmesi elemanından sonra |

`renderAbove()` / `renderBelow()` her zaman bir dizi döndürür (JSX children'a
`...` ile yayılır); hata durumunda boş dizi.

## API

```ts
addServerListElement("above", "my-id", () => <MyButton />)
removeServerListElement("above", "my-id")   // plugin stop()'ta
```

## requiresRestart

`true` (kod patch'i).
