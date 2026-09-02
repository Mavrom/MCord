# MessageLogger

Silinen mesajı **yeniden göndermeden**, aynı mesaj kimliği ve yazarıyla yalnızca
bu istemcinin sohbet görünümünde tutar. Düzenlemelerin önceki içeriklerini de
oturum boyunca yerelde gösterir. Bir sohbet komutu değildir.

## referans katalog referansı

Davranış, [referans katalog resmi MessageLogger kaynağı](https://github.com//referans katalog/tree/ce4e84277e7de349f07e0d4d5820370d4c31f80a/src/plugins/messageLogger)
ve yerel HistoryModal görünümü incelenerek MCord API'lerine uyarlandı.
referans katalog dosyalarının birebir kopyası değildir.

- Tekli ve toplu silme, yalnızca **MessageStore'un kanal önbelleği** sınırında
  ele alınır. Silme olayının diğer Flux tüketicilerine ulaşması engellenmez.
- Kaydedilecek mesaj önbellekten çıkarılmaz. Silindiği, kırmızı metin/arka plan
  ve “yalnızca sende görünüyor” etiketiyle gösterilir.
- Düzenleme öncesi içerik, MessageStore'un normal güncellemesinden hemen önce
  alınır; normal mesaj güncellemesi devam eder.
- Önceki sürümler mesaj altında gösterilebilir. Düzenlendi etiketine, yerel
  geçmiş düğmesine veya mesaj bağlam menüsüne basınca yerel pencere açılır.
- Düzenlemeyle kaldırılan eklerin bağlantıları saklanabilir. Sunucudan silinen
  dosya tekrar yüklenmez; Discord CDN bağlantısı zaman aşımına uğrayabilir.
- Kendi mesajlarını, botları, belirli kullanıcı/kanal/üst kanal/sunucuları yok
  sayma seçenekleri vardır. Geçici (ephemeral) mesajlar kaydedilmez.
- Mesaj veya kanal bağlam menüsünden geçmiş temizlenebilir. Silinmiş mesajı
  geçmişten temizlemek, yalnızca yerel MessageStore'dan da kaldırır.
- Başka kullanıcıların nonce çakışmasıyla mevcut mesajı değiştirmesi önlenmeye
  çalışılır; yukarı okla son mesajı düzenleme yolu silinmiş kaydı atlar.

## Yerellik ve sınırlar

- Mesaj gönderme, mesaj düzenleme REST çağrısı, webhook veya kayıt dışa aktarma
  yolu yoktur. Komut kaydı ve CommandsAPI bağımlılığı yoktur.
- Geçmiş diske, IndexedDB'ye veya ayarlara yazılmaz. Ayarlara yalnızca
  kullanıcının seçenekleri kaydedilir.
- Plugin kapatılınca, hesap değişince/çıkış yapılınca veya ilgili kanal/sunucu
  kaldırılınca geçmiş temizlenir.
- Yalnızca istemcinin zaten görmüş olduğu mesajlar korunabilir. Plugin
  açılmadan önce silinmiş veya hiçbir zaman yüklenmemiş mesajlar geri getirilemez.
- Varsayılan olarak en fazla 500 mesajın geçmişi, mesaj başına son 20 önceki
  metin sürümü ve en fazla 32.000 karakterlik geçmiş tutulur. En eski kayıtlar
  çıkarılır; çıkarılan silinmiş mesaj yerel görünümden de temizlenir.
- MCord uyarlamasında geçmiş metni güvenli düz metin olarak gösterilir;
  referans katalog özel Markdown ayrıştırıcısı ve grup halinde daraltma bileşeni
  kopyalanmamıştır. Daraltma seçeneği silinen mesajın metnine uygulanır.

## Ayarlar

| Ayar | Varsayılan | İşlev |
| --- | --- | --- |
| logDeletes | Açık | Silinen mesajı yerelde tutar |
| logEdits | Açık | Düzenleme geçmişini tutar |
| logDeletedAttachments | Açık | Kaldırılan eklerin bağlantılarını tutar |
| inlineEdits | Açık | Önceki metinleri mesaj altında gösterir |
| deleteStyle | Kırmızı metin | Kırmızı metin veya arka plan |
| collapseDeleted | Kapalı | Silinen mesaj metnini daraltır |
| ignoreBots | Açık | Bot mesajlarını kaydetmez |
| ignoreSelf | Kapalı | Kendi mesajlarını kaydetmez |
| ignoreUsers / ignoreChannels / ignoreGuilds | Boş | Virgülle ayrılan tam kimlikleri yok sayar |
| maxEntries | 500 | Geçmişi saklanan toplam mesaj üst sınırı |

Önceden kaydedilmiş `keepDeletedMessages` tercihi ilk başlangıçta `logDeletes`
olarak taşınır. Mevcut `ignoreSelf` ve diğer kayıtlı tercihler korunur.

## Uyumluluk

Pluginin etkinleştirilmesi/devre dışı bırakılması için Discord'u yeniden
başlatmak gerekir. MessageStore ve düzenlendi etiketi yamaları, referans katalog
incelenen Discord modül sınırlarına dayanır. Bir yama eşleşmezse MCord uyarı
verir; olmayan bir başarı veya canlı Discord uyumluluğu iddia edilmez.
