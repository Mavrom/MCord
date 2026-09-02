# Unindent

Çok satırlı mesajlardaki gereksiz baştaki girintiyi gönderirken (ve
düzenlerken) kaldırır. Kod editöründen kopyalanan blokları temizler.

## Nasıl çalışır

Kod patch'i **yok** — `MessageEventsAPI` kancaları.

1. Metin ``` ``` ``` blokları etrafından bölünür; blok içi **dokunulmaz**
   (girinti orada anlamlı).
2. Blok dışı her parçada, boş olmayan satırların ortak baştaki boşluğu
   hesaplanır ve her satırdan çıkarılır. Göreli girinti korunur.

## Ayarlar

Yok.

## requiresRestart

`false`.

## Testler

`unindent.test.ts` — ortak girinti, göreli girinti, boş satırlar, kod bloğu.
