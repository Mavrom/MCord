# NoticesAPI

Plugin'lerin ekranın üstündeki bildirim çubuğunda ("notice bar") notice
göstermesini sağlar.

**Altyapı plugin'i** — `required: true`.

## Nasıl çalışır

Discord'un notice çubuğu tek bir `r.memo` bileşeni: kendi notice store'undan
`getNotice()` çekiyor, sonuç `null` ise `return null` yapıyor. Bileşen bir modül
literali içinde tanımlı, dışarıdan tutulabilir referansı yok → kod patch'i.

Çapa `.APP_NOTICE_VIEWED,` (bundle'da tek). Yapısal desen: "notice yok" korumasını
yakalayıp `$self.render()` döndürür. Discord'un kendi notice'i varken bizimki
beklemede kalır; Discord'unki yokken bizim çubuğumuz görünür.

Döndürülen bileşen kendi aboneliğiyle kuyruğu bağımsız takip eder — `nA` yeniden
render olmasa da notice güncellemeleri anında yansır.

## API

```ts
showNotice({ message, buttons?, color?, source? })
showTextNotice("Güncelleme hazır", "Yeniden başlat", restart)
dismissNotice()                 // aktif notice'i kapat, sıradakine geç
removeNoticesBySource("MyPlugin")   // plugin stop()'ta çağrılmalı
```

## requiresRestart

`true` (kod patch'i).
