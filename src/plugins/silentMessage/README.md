# SilentMessage

Sohbet çubuğuna bir düğme ekler; açıkken gönderdiğin sonraki mesaj `@silent`
önekiyle yollanır ve karşı tarafta **bildirim oluşturmaz**.

## Nasıl çalışır

Kod patch'i **yok**.

- **Düğme** — `ChatComponentsAPI` üzerinden `chatBarButton`. Tıklayınca
  aç/kapa durumu değişir.
- **Önek** — `MessageEventsAPI`'nin `onBeforeMessageSend` kancası, durum
  açıksa ve içerik zaten `@silent` ile başlamıyorsa başına `@silent ` ekler.
  `@silent` Discord'un kendi sunucu tarafı sessiz-mesaj işaretidir.

## Ayarlar

| Ayar | Tür | Varsayılan | Açıklama |
|---|---|---|---|
| `autoDisable` | BOOLEAN | `true` | Mesaj gönderilince düğmeyi otomatik kapat |
| `persistState` | BOOLEAN | `false` | Aç/kapa durumunu yeniden başlatmalar arasında hatırla |

`persistState` kapalıyken durum yalnızca oturum belleğinde tutulur.

## requiresRestart

`false`.
