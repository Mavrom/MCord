# CommandsAPI

Plugin'lerin kendi eğik çizgi komutlarını kaydetmesini sağlar.

**Altyapı plugin'i** — `required: true`, kullanıcı kapatamaz, ayarlar listesinde
"zorunlu" rozetiyle görünür.

## Nasıl çalışır

`getBuiltInCommands` fonksiyonuna `after` patch'i uygulanır ve kayıtlı MCord
komutları dönen listeye eklenir. Kod patch'i yoktur (plan §5.1).

## API

```ts
registerCommand(command, pluginName)   // PluginManager otomatik çağırır
unregisterCommand(name)                // PluginManager otomatik çağırır
findOption(args, "adet", 10)           // argüman okuma yardımcısı
```

Plugin'ler `commands: [...]` alanını tanımlar; kayıt ve silme `PluginManager`
tarafından simetrik olarak yapılır (plan §6.5).

## requiresRestart

`false` — fonksiyon patch'i geri alınabilir.
