# ShowHiddenChannels

Görme iznin olmayan kanalların **adını ve sırasını** kanal listesinde gösterir.
Kanalın içeriği yüklenmez; açınca kilit ikonlu sade bir bilgi ekranı görünür.

## Nasıl çalışır

Vencord'un `ShowHiddenChannels` plugin'inin portudur (kilit ekranı sadeleştirildi).

Güncel Discord kanal listesini `ChannelListStore` içindeki `renderLevel`
hesabından üretiyor ve izin kontrolü orada kod seviyesinde yapılıyor.
`PermissionStore.can` sonucunu değiştirmek bu yüzden yetmiyordu (eski sürüm
gizli kanalları hiç listelemiyordu). Bu sürüm:

- `renderLevel` hesabındaki izin dallarını kaldırır → kanallar kendi sırasında listelenir;
- listede kilit ikonu gösterir, okunmamış göstergesini gizler;
- gizli kanala bağlanmayı / mesaj çekmeyi (403) / kısayolla atlamayı engeller;
- gizli kanalın sayfasında içerik yerine bilgi ekranı çizer;
- Discord'un özel kanal adlarını istemcide gizleyen deneyini
  (`2026-02-private-channel-hiding`) kapatır.

> Sunucu bir kanalın adını hiç göndermiyorsa istemci bunu gösteremez; plugin
> yalnız istemci tarafı gizlemeyi kaldırır.

## Ayarlar (değişince yeniden başlatma gerekir)

| Ayar | Tür | Varsayılan | Açıklama |
|---|---|---|---|
| `showVoiceChannels` | BOOLEAN | `true` | Gizli ses kanallarını da göster |
| `hideUnreads` | BOOLEAN | `true` | Gizli kanallarda okunmamış göstergesini gizle |

## Reporter testi

Tüm patch'ler reporter'ın **Bad Patches** doğrulamasına girer.
