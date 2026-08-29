# MessageEventsAPI

Mesaj gönderme, düzenleme ve tıklama olaylarını plugin'lere açar.

**Altyapı plugin'i** — `required: true`.

## Nasıl çalışır

Kod patch'i yoktur; üçü de fonksiyon patch'i (plan §5.1):

| Olay | Yöntem |
|---|---|
| Gönderme | `MessageActions.sendMessage` üzerinde `instead` |
| Düzenleme | `MessageActions.editMessage` üzerinde `instead` |
| Tıklama | `document` üzerinde capture-fazlı `click` dinleyicisi |

Dinleyiciler sırayla ve her biri kendi try/catch'inde çalışır; biri patlarsa
mesaj yine de gönderilir.

## API

```ts
addMessagePreSendListener(async (channelId, message, extra) => {
    message.content = message.content.toUpperCase();
})
addMessagePreEditListener((channelId, messageId, message) => { ... })
addMessageClickListener((message, channel, event) => { ... })
```

Plugin'ler doğrudan `onBeforeMessageSend` / `onBeforeMessageEdit` alanlarını da
tanımlayabilir; `PluginManager` kaydı ve silmeyi üstlenir (plan §6.5).

## requiresRestart

`false`.
