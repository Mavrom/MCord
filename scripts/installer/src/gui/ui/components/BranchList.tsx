/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import type { BranchStatus } from "../api";

type Props = {
    branches: BranchStatus[];
    selected: string | null;
    onSelect: (id: string) => void;
};

export function BranchList({ branches, selected, onSelect }: Props) {
    return (
        <div>
            {branches.map(b => (
                <div
                    key={b.id}
                    className={`branch${selected === b.id ? " selected" : ""}`}
                    onClick={() => onSelect(b.id)}
                >
                    <div className="meta">
                        <div>{b.name}</div>
                        <div className="badge">{b.version.replace("app-", "v")}</div>
                    </div>
                    <div className={`badge${b.installed ? " ok" : ""}`}>
                        {b.installed ? "MCord kurulu" : b.hasDevInjection ? "dev enjeksiyon" : "kurulu değil"}
                        {b.running ? " · açık" : ""}
                    </div>
                </div>
            ))}
        </div>
    );
}
