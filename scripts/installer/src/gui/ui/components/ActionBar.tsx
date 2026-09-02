/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

type Props = {
    disabled: boolean;
    installed: boolean;
    onInstall: () => void;
    onRepair: () => void;
    onUninstall: () => void;
};

export function ActionBar({ disabled, installed, onInstall, onRepair, onUninstall }: Props) {
    return (
        <div className="actions">
            <button disabled={disabled} onClick={onInstall}>{installed ? "Yeniden Kur" : "Kur"}</button>
            {installed && <button className="secondary" disabled={disabled} onClick={onRepair}>Onar</button>}
            {installed && <button className="danger" disabled={disabled} onClick={onUninstall}>Kaldır</button>}
        </div>
    );
}
