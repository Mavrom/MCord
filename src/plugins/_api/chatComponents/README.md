# ChatComponentsAPI

Plugin'lerin sohbet çubuğuna (mesaj yazma alanı) düğme eklemesini sağlar.
Mesaj süslemesi kayıt defterini de barındırır (enjeksiyonu henüz yok).

**Altyapı plugin'i** — `required: true`.

## Nasıl çalışır

Düğmeler `ChannelTextAreaButtons` bileşeninde yerel bir diziye push ediliyor ve
dizi doğrudan `children`'a veriliyor; dışarıdan tutulabilir fonksiyon referansı
yok → kod patch'i.

Çapa `"ChannelTextAreaButtons"` (bundle'da tek, Discord'un kendi bileşen adı).
Desen karakter mesafesine değil **yapıya** bağlı: aynı ifade içinde aynı dizinin
`children` olarak kullanılması aranıyor. Boşluk kontrolünden önce enjekte edilir
ki Discord'un kendi düğmeleri kapalıyken bizimkiler yine görünsün.

Enjekte edilen fonksiyon her render'da çağrılıyor ve kendi try/catch'inde: hata
sızarsa sohbet girişi komple çöker, bu yüzden kritik.

## API

```ts
addChatBarButton("my-id", props => <Button onClick={…} />)
removeChatBarButton("my-id")

addMessageDecoration("my-id", props => <Deco />)   // kayıt var, enjeksiyon YOK
removeMessageDecoration("my-id")
```

Plugin'ler `chatBarButton` / `renderMessageDecoration` alanlarını da tanımlayabilir;
`PluginManager` kaydı/silmeyi üstlenir.

## requiresRestart

`true` (kod patch'i).
