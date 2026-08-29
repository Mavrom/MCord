# TextReplace

Gönderdiğin mesajlarda otomatik metin değiştirme kuralları uygular.

## Nasıl çalışır

Patch kullanmaz. `MessageEventsAPI` üzerinden `onBeforeMessageSend` kancasına
bağlanır ve mesaj gönderilmeden hemen önce içeriği dönüştürür. Bu yüzden
`requiresRestart: false` — açıp kapatmak anında etkili.

## Ayarlar

| Ayar | Tür | Varsayılan | Açıklama |
|---|---|---|---|
| `rules` | STRING (JSON) | `[]` | Kural listesi |
| `skipCodeBlocks` | BOOLEAN | `true` | Kod bloklarının içinde değiştirme yapma |

### Kural biçimi

```json
[
  { "find": "brb", "replace": "birazdan dönerim" },
  { "find": "\\bstfu\\b", "replace": "sus", "isRegex": true },
  { "find": "gg", "replace": "iyi oyun", "onlyIfIncludes": "oyun" }
]
```

- `isRegex: true` ise `find` bir regex olarak derlenir (global bayrakla).
- `onlyIfIncludes` verilirse kural sadece metin o parçayı içeriyorsa uygulanır.
- Geçersiz JSON veya regex ayar kaydedilirken reddedilir.

## Reporter testi

`applyRules` saf bir fonksiyon olduğu için birim testi var:
`src/plugins/textReplace/index.test.ts`. Webpack araması veya kod patch'i
içermediğinden reporter'ın "Bad Patches" / "Bad Webpack Finds" listelerinde
görünmez.
