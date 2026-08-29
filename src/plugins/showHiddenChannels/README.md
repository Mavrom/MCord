# ShowHiddenChannels

Görme iznin olmayan kanalları kanal listesinde gösterir.

## Nasıl çalışır

**Kod patch'i kullanmaz.** Kanal listesi görünürlüğü `PermissionStore.can`
sonucuna bağlıdır; bu fonksiyon webpack üzerinden erişilebilir olduğundan
`after` patch'i yeterli (plan §5.1 — varsayılan fonksiyon patch'i).

`VIEW_CHANNEL` (1 << 10) izni için `false` dönen çağrılarda `true` döndürülür ve
kanal kimliği oturum içi bir sete kaydedilir.

`blockNavigation` açıkken gizli bir kanala tıklamak `selectChannel` üzerinde
`instead` patch'i ile engellenir; sunucu 403 döndürüp arayüzü bozmaz.

## Bilinçli kapsam dışı

**Kilit ikonu, gri stil ve izin listesi paneli** bu sürümde yok. Bunlar kanal
listesi bileşenine kod patch'i gerektiriyor; plan §5.1'in
"kod patch'i sadece fonksiyon patch'inin yetmediği yerde" kuralı gereği ve
"az ve sağlam" küratörlük ilkesi (plan §6.6) uyarınca v1'de eklenmedi.

Pratik sonuç: gizli kanallar listede normal kanallar gibi görünür, ama
tıklandığında uyarı verilir.

## Ayarlar

| Ayar | Tür | Varsayılan | Açıklama |
|---|---|---|---|
| `showVoiceChannels` | BOOLEAN | `true` | Gizli ses kanallarını da göster |
| `blockNavigation` | BOOLEAN | `true` | Gizli kanala girmeyi engelle |

## Reporter testi

`findByKeys("can", "canWithPartialContext")` ve
`findByKeys("selectChannel", "selectVoiceChannel")` aramaları reporter'ın
**Bad Webpack Finds** doğrulamasına girer.
