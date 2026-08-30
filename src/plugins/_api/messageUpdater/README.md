# MessageUpdaterAPI

Plugin'lerin bir mesajı yeniden render etmeye zorlamasını sağlar.

**Altyapı plugin'i** — `required: true`. Bağımlılık işaretçisi: kullanan plugin
`dependencies: ["MessageUpdaterAPI"]` yazar.

## Nasıl çalışır

**Kod patch'i yoktur, fonksiyon patch'i de yoktur.** `updateMessage` saf bir
FluxDispatcher çağrısı:

```
FluxDispatcher.dispatch({ type: "MESSAGE_UPDATE", message: { ...record, ...fields } })
```

Discord'un `MessageStore`'u `MESSAGE_UPDATE` olayını dinliyor ve mevcut kaydı
gelen nesneyle `merge` edip yeni bir referans üretiyor — yeni referans, abone
bileşenleri yeniden render ediyor. Bu, gerçek bir geçidin (gateway) göndereceği
güncellemeyle aynı yol.

## API

```ts
updateMessage(channelId, messageId)                      // aynı içerik, yeni referans
updateMessage(channelId, messageId, { content: "yeni" }) // alan üzerine yazarak
```

## requiresRestart

`false` — patch yok.
