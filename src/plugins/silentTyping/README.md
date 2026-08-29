# SilentTyping

"… yazıyor" göstergesini karşı tarafa göndermez.

## Nasıl çalışır

**Kod patch'i kullanır** — ve bu bilinçli.

`startTyping` bir nesne literali içinde tanımlı; property adı minify sırasında
mangle ediliyor ve dışarıdan erişilebilir bir fonksiyon referansı kalmıyor.
Dolayısıyla plan §5.1'in tercih ettiği fonksiyon patch'i burada **uygulanamıyor**;
patch `reason` alanında bu gerekçe yazılı.

Çapa olarak dispatch tipi kullanılıyor — bu string minify sırasında değişmiyor:

```
find:    '.dispatch({type:"TYPING_START_LOCAL"'
match:   /startTyping\(\i\){.+?},stop/
replace: "startTyping:$self.startTyping,stop"
```

Yerine geçen fonksiyon sunucuya **`TYPING_START` isteğini hiç göndermez**.
Orijinal fonksiyonun ikinci işi olan yerel `TYPING_START_LOCAL` dispatch'i
ayara bağlı olarak yapılır.

## Ayarlar

| Ayar | Tür | Varsayılan | Açıklama |
|---|---|---|---|
| `isEnabled` | BOOLEAN | `true` | Göstergeyi gizle |
| `showLocalIndicator` | BOOLEAN | `true` | Kendi arayüzünde göstergeyi yine de göster |

**Not:** `isEnabled` kapatmak gerçek göstergeyi geri getirmez — patch modül
yüklenirken uygulandığı için istek yolu zaten kaldırılmıştır. Tam olarak
kapatmak için plugin'i devre dışı bırakıp yeniden başlat.

## requiresRestart

`true` (otomatik) — kod patch'i içerdiği için (plan §7.3).

## Reporter testi

Kod patch'i olduğundan reporter'ın **Bad Patches** doğrulamasına girer: Discord
`TYPING_START_LOCAL` çevresindeki kodu değiştirirse saatlik CI koşusu haber verir.
