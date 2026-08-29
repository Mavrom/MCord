# ContextMenuAPI

Plugin'lerin Discord bağlam menülerine öğe eklemesini sağlar.

**Altyapı plugin'i** — `required: true`.

## Nasıl çalışır

`ContextMenuActions.openContextMenu`'ye `before` patch'i uygulanır ve çağrıya
verilen render fonksiyonu sarılır. Menü render edildiğinde ortaya çıkan props'a
kayıtlı patch'ler uygulanır.

Menü bileşeni plugin'e bağlı `NodePatcher` ile sarılır: aynı tip iki kez
sarılmaz (WeakMap cache), böylece React her render'da yeni tip görüp remount
yapmaz (plan §5.4).

## API

```ts
addContextMenuPatch("channel-context", (children, props) => { ... })
removeContextMenuPatch("channel-context", patch)
addGlobalContextMenuPatch(patch)   // her menüde çalışır
```

Plugin'ler `contextMenus: { "navId": patch }` alanını tanımlar; kayıt/silme
`PluginManager` tarafından yapılır (plan §6.5).

Her patch kendi try/catch'inde çalışır: biri patlarsa menü açılmaya devam eder.

## requiresRestart

`false`.
