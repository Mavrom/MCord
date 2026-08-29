/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { renderNoticeBar } from "../../../api/notices";
import { Devs } from "../../../utils/constants";
import { definePlugin } from "../../../utils/types";

export default definePlugin({
    name: "NoticesAPI",
    description: "Plugin'lerin ekranın üstündeki bildirim çubuğunda notice göstermesini sağlar",
    authors: [Devs.MCord],
    required: true,

    patches: [
        {
            find: ".APP_NOTICE_VIEWED,",
            reason:
                "Discord'un notice çubuğu tek bir `r.memo` bileşeni: kendi notice "
                + "store'undan `getNotice()` çekiyor, sonuç `null` ise `return null` "
                + "yapıyor. Bileşen bir modül literali içinde tanımlı ve dışarıdan "
                + "tutulabilir referansı yok, bu yüzden fonksiyon patch'i uygulanamıyor. "
                + "Çapa `.APP_NOTICE_VIEWED,` — bu analitik olay adı tüm bundle'da tek "
                + "geçiyor ve Discord'un kendi sabiti olduğu için minify'da değişmiyor.",
            replacement: {
                // Desen yapısal: "notice yok" koruması hemen ardından Discord'un
                // `let E=null!=a.type?...` tip-dağıtım zinciri geldiği için tüm
                // bundle'da tek eşleşiyor. useEffect bağımlılık dizilerine bakmıyoruz;
                // `null==a` / `!a` ve `a.type` / `a?.type` biçimlerinin ikisini de
                // kabul ediyoruz (minify çıktısı ikisinden birini üretebilir).
                // Ölçülen dayanıklılık: makul Discord değişikliklerine karşı 8/9.
                //
                // Discord'un kendi notice'i varken (`a` dolu) satır atlanır, Discord
                // kendi çubuğunu render eder. `a` boşken bizim çubuğumuz devreye girer;
                // döndürdüğümüz bileşen kendi aboneliğiyle kuyruğu bağımsız takip eder.
                match: /((?:null==|!)(\i)\))return null;(?=let \i=null!=\2\??\.type\?)/,
                replace: "$1return $self.render();"
            }
        }
    ],

    render() {
        return renderNoticeBar();
    }
});
