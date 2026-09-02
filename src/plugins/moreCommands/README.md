# MoreCommands

Discord'un yerleşik eğik çizgi komutlarına birkaç metin yardımcısı ekler.

## Komutlar

| Komut | İş |
|---|---|
| `/echo <message>` | Metni normal mesaj gibi gönderir (görünmez bot mesajı **değil** — MCord'un komut sistemi metni kutuya yazıp gönderir) |
| `/mock <message>` | `MeTnİ aLaYcI` büyük/küçük harfe çevirir |
| `/spoiler <message>` | Her kelimeyi `\|\|spoiler\|\|` ile sarar |
| `/shrug [message]` | `¯\_(ツ)_/¯` ekler |
| `/lenny [message]` | `( ͡° ͜ʖ ͡°)` ekler |
| `/tableflip [message]` | `(╯°□°)╯︵ ┻━┻` ekler |
| `/unflip [message]` | `┬─┬ ノ( ゜-゜ノ)` ekler |

## Nasıl çalışır

Kod patch'i **yok**. `CommandsAPI` bağımlılığı üzerinden `commands` dizisiyle
kayıt olur; her komut `execute` içinden `{ content }` döndürür ve Discord bunu
mesaj kutusuna yazıp gönderir (`BUILT_IN_TEXT` girdi tipi).

## Ayarlar

Yok.

## requiresRestart

`false` — sadece komut kaydı; patch yok.
