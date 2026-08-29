# MessageLogger

Silinen ve düzenlenen mesajları oturum boyunca bellekte kaydeder.

## Nasıl çalışır

Plan §6.6'da bu plugin "fonksiyon patch'iyle çözülebilenler" kategorisinde;
kod patch'i kullanmaz.

- **Silme:** `FluxDispatcher.dispatch` `instead` ile sarılır. `MESSAGE_DELETE`
  olayı geldiğinde mesaj store'dan okunup kaydedilir; `keepDeletedMessages`
  açıksa olay yutulur ve mesaj sohbette kalır.
- **Düzenleme:** `MESSAGE_UPDATE` Flux handler'ı ile yakalanır. Handler'lar
  `PluginManager` tarafından try/catch'e sarıldığı için bir hata dispatcher'ı
  kilitlemez (plan §6.5).

Kayıtlar **yalnızca bellekte** tutulur, diske yazılmaz, hiçbir yere gönderilmez.
`maxEntries` aşıldığında en eski kayıt düşer.

## Komut

`/mcord-log` — son kayıtları listeler.

## Ayarlar

| Ayar | Tür | Varsayılan | Açıklama |
|---|---|---|---|
| `keepDeletedMessages` | BOOLEAN | `true` | Silme olayını yut, mesaj sohbette kalsın |
| `logEdits` | BOOLEAN | `true` | Düzenlemeleri de kaydet |
| `ignoreSelf` | BOOLEAN | `true` | Kendi mesajlarını kaydetme |
| `maxEntries` | SLIDER | `500` | Bellekteki en fazla kayıt |

## Uyarı

`keepDeletedMessages` açıkken Discord'un iç durumu ile sunucudaki durum
ayrışır: silinmiş bir mesaj istemcinde durmaya devam eder. Sohbeti yeniden
yüklemek durumu düzeltir.

## Reporter testi

`findByKeys("dispatch", "subscribe", "_subscriptions")`, `getMessage` ve
`getCurrentUser` aramaları reporter'ın **Bad Webpack Finds** doğrulamasına girer.
