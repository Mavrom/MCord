# MemberListDecoratorsAPI

Plugin'lerin sunucu üye listesinde bir üyenin isminin hemen sağına küçük eleman
(rozet, ikon, etiket) eklemesini sağlar.

**Altyapı plugin'i** — `required: true`.

## Nasıl çalışır

Üye listesi satırı `AvatarWithText` bileşenini kullanıyor ve `decorators` prop'unu
ismin hemen sağında render ediyor. Bu prop bir modül literali içinde inline JSX
olarak veriliyor (`decorators:(0,r.jsx)(SahipTacı,{...})`) → kod patch'i.

Çapa `,ownerTooltipText:u,premiumSince:R,onClickPremiumGuildIcon` (bundle'da tek).
Desen `decorators:` değerinin bir `jsx(Bileşen,{user:<değişken>...})` çağrısı
olmasına dayanıyor (prop eklenmesine, jsx→jsxs değişimine, değişken adı değişimine
karşı dayanıklı — ölçülen 7/7).

Discord'un kendi sahip-tacı elemanı korunur, bizimkiler bir fragment içinde eklenir.

> Kapsam: şimdilik yalnızca sunucu üye listesi. DM listesi kapsanmıyor.

## API

```ts
addMemberListDecorator("my-id", props => <Badge user={props.user} />)
removeMemberListDecorator("my-id")   // plugin stop()'ta
```

Her renderer kendi try/catch'inde: biri patlarsa üye listesi çökmez.

## requiresRestart

`true` (kod patch'i).
