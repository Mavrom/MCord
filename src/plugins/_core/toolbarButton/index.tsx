/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/**
 * Discord'un üst bar toolbar'ına (inbox / yardım ikonlarının yanı) bir **MC**
 * butonu koyar → tıkla → MCord ayarları açılır.
 *
 * Kanıtlanmış açık-kaynak istemcinin (Vencord) `VencordToolbox` plugin'iyle
 * aynı yaklaşım: **kod patch'i**. Eski MCord sürümü DOM enjeksiyonu yapıyordu
 * (`querySelector` + `MutationObserver`); `start()` DOMContentLoaded'da
 * çalıştığı için toolbar henüz yokken "Toolbar bulunamadı" uyarısı basıyor,
 * butonu ancak ilk mutasyondan sonra ekleyebiliyordu. Kod patch'i toolbar'ın
 * kendi `trailing` bölümüne giriyor — zamanlamadan bağımsız ve CI reporter
 * tarafından doğrulanıyor.
 */

import { ErrorBoundary } from "../../../components/ErrorBoundary";
import { Devs } from "../../../utils/constants";
import { definePlugin } from "../../../utils/types";
import { useRef } from "../../../webpack/common";
import { findComponentByCodeLazy } from "../../../webpack/lazy";
import { toggleSettings } from "../settings";

const HeaderBarIcon = findComponentByCodeLazy(".HEADER_BAR_BADGE_BOTTOM,", 'position:"bottom"');

function Icon() {
    return (
        <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden="true">
            <text
                x="12"
                y="16"
                textAnchor="middle"
                fill="currentColor"
                fontSize="11"
                fontWeight="700"
                fontFamily="var(--font-primary, sans-serif)"
            >
                MC
            </text>
        </svg>
    );
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
    description: "Discord toolbar'ına MCord ayarlarını açan MC butonu ekler",
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
        return (
            <>
                {children}
                <WrappedButton key="mcord-toolbar-button" />
            </>
        );
    }
});
