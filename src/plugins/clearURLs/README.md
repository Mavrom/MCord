# ClearURLs

Gönderdiğin (ve düzenlediğin) mesajlardaki bağlantılardan izleme
parametrelerini siler.

## Nasıl çalışır

Kod patch'i **yok** — `MessageEventsAPI` üzerinden `onBeforeMessageSend` ve
`onBeforeMessageEdit` kancalarıyla çalışır. Mesaj içeriğindeki her `http(s)`
bağlantısı `URL` ile ayrıştırılır, izleyici parametreler silinir, sonuç geri
yazılır.

Kural katmanları (`defaultRules.ts`):

- **`GLOBAL_PARAMS`** — her host'ta güvenle silinen kimlikler: `utm_*`,
  `fbclid`, `gclid`, `mc_eid`, `igshid` …
- **`GLOBAL_PREFIXES`** — `utm_`, `pk_`, `piwik_`, `matomo_`, `hmb_` önekleri.
- **`HOST_RULES`** — host'a bağlı anlamı olan parametreler yalnızca o host'ta
  silinir: `youtube.com` → `si`, `x.com` → `s`/`t`, `amazon.*` → `ref`/`tag` …
  Başka bir sitede `?s=` sorgusuna dokunulmaz.

Hiçbir parametre silinmezse bağlantı **string olarak aynen** kalır — yeniden
serileştirmeden kaynaklı fark (parametre sırası, kodlama) oluşmaz.

## Ayarlar

| Ayar | Tür | Varsayılan | Açıklama |
|---|---|---|---|
| `skipCodeBlocks` | BOOLEAN | `true` | ``` ``` ``` ve `` `…` `` içindeki bağlantılara dokunma |

## requiresRestart

`false`.

## Testler

`clean.test.ts` — global + host kuralları, kod bloğu atlama, URL olmayan girdi.
