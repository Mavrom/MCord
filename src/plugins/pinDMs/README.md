# PinDMs

Özel mesaj kanallarını listenin başına sabitler.

## Nasıl çalışır

Plan §6.6'da "fonksiyon patch'iyle çözülebilenler" kategisinde; kod patch'i yok.

Discord'un özel mesaj sıralama deposundaki `getPrivateChannelIds` (veya
`getSortedPrivateChannels`) fonksiyonuna `after` patch'i uygulanır ve dönen liste
`reorder()` ile yeniden sıralanır. Sabitlenmiş kanallar başa alınır, geri kalan
sıra Discord'un kendi sıralamasıyla aynı kalır.

Sabitleme/kaldırma işlemi kanal bağlam menüsüne `ContextMenuAPI` üzerinden eklenir.

## Ayarlar

| Ayar | Tür | Varsayılan | Açıklama |
|---|---|---|---|
| `pinned` | CUSTOM | `[]` | Sabitlenen kanal kimlikleri (UI'da gösterilmez) |
| `pinOrderNewestFirst` | BOOLEAN | `false` | En son sabitlenen üstte olsun |

## Reporter testi

- `reorder()` saf fonksiyon: `src/plugins/pinDMs/reorder.test.ts` (6 test)
- `findByKeys("getPrivateChannelIds")` araması reporter'ın **Bad Webpack Finds**
  doğrulamasına girer.
