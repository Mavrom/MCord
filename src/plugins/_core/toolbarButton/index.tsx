/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/**
 * Discord'un üst bar toolbar'ına (inbox / yardım ikonlarının yanı) MCord'un
 * kedi maskotunu buton olarak koyar → tıkla → MCord ayarları açılır.
 *
 * Yöntem **kod patch'i**: toolbar'ın kendi `trailing` bölümüne giriyor. Eski
 * DOM enjeksiyonu (`querySelector` + `MutationObserver`) DOMContentLoaded'da
 * toolbar henüz yokken çalışıp butonu geç ekliyordu; patch zamanlamadan
 * bağımsız ve CI reporter tarafından doğrulanıyor.
 */

import { ErrorBoundary } from "../../../components/ErrorBoundary";
import { ShadowCat } from "../../../components/ShadowCat";
import { Devs } from "../../../utils/constants";
import { definePlugin } from "../../../utils/types";
import { useRef } from "../../../webpack/common";
import { findComponentByCodeLazy } from "../../../webpack/lazy";
import { toggleSettings } from "../settings";

const HeaderBarIcon = findComponentByCodeLazy(".HEADER_BAR_BADGE_BOTTOM,", 'position:"bottom"');

function Icon() {
    return <ShadowCat size={24} />;
}

function McordToolbarButton() {
    const buttonRef = useRef(null);

    return (
        <HeaderBarIcon
            ref={buttonRef}
            onClick={() => toggleSettings()}
            tooltip="MCord ayarları (Ctrl+Alt+M)"
            icon={Icon}
        />
    );
}

const WrappedButton = ErrorBoundary.wrap(McordToolbarButton, { noop: true });

export default definePlugin({
    name: "ToolbarButton",
    description: "Discord toolbar'ına MCord ayarlarını açan kedi butonu ekler",
    authors: [Devs.MCord],
    required: true,
    requiresRestart: true,

    patches: [
        {
            find: '?"BACK_FORWARD_NAVIGATION":',
            reason: "Üst bar toolbar'ının sağ (trailing) ikon grubu.",
            replacement: {
                match: /(trailing:.{0,50}?)\i\.Fragment,(?=\{children:\[)/,
                replace: "$1$self.TrailingWrapper,"
            }
        }
    ],

    TrailingWrapper({ children }: { children?: any }) {
        // Buton, gelen kutusu/yardım ikonlarının SOLUNDA — bu yüzden
        // `children`'dan önce render ediliyor.
        return (
            <>
                <WrappedButton key="mcord-toolbar-button" />
                {children}
            </>
        );
    }
});
