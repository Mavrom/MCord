/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { type ActiveNotification, subscribeToNotifications } from "../api/notifications";
import { getReactDOMClient, React } from "../webpack/react";
import { c, s } from "./theme";

const CONTAINER_ID = "mcord-notifications";

function NotificationList() {
    const [items, setItems] = React.useState<ActiveNotification[]>([]);

    React.useEffect(() => subscribeToNotifications(setItems), []);

    if (items.length === 0) return null;

    return (
        <div
            style={{
                position: "fixed",
                right: "16px",
                bottom: "16px",
                zIndex: 10000,
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                maxWidth: "360px",
                pointerEvents: "none"
            }}
        >
            {items.map(item => (
                <div
                    key={item.id}
                    style={{
                        ...s.card,
                        background: "var(--background-floating, #111214)",
                        borderLeft: `3px solid ${item.color ?? c.accent}`,
                        boxShadow: "0 8px 16px rgba(0,0,0,.24)",
                        pointerEvents: "auto",
                        cursor: item.onClick ? "pointer" : "default"
                    }}
                    onClick={() => item.onClick?.()}
                >
                    <div style={s.spread}>
                        <strong style={{ color: c.heading }}>{item.title}</strong>
                        <button
                            style={{
                                background: "none", border: "none", cursor: "pointer",
                                color: c.muted, fontSize: "16px", lineHeight: 1
                            }}
                            onClick={event => { event.stopPropagation(); item.close(); }}
                            aria-label="Kapat"
                        >
                            ×
                        </button>
                    </div>

                    <div style={s.muted}>{item.body}</div>

                    {item.actions && item.actions.length > 0 && (
                        <div style={{ ...s.row, flexWrap: "wrap" }}>
                            {item.actions.map(action => (
                                <button
                                    key={action.label}
                                    style={{ ...s.button, ...s.buttonSecondary, padding: "4px 10px" }}
                                    onClick={event => { event.stopPropagation(); action.onClick(); }}
                                >
                                    {action.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

let root: { unmount(): void } | null = null;

export function mountNotificationHost(): void {
    if (root != null) return;

    const container = document.createElement("div");
    container.id = CONTAINER_ID;
    document.body.appendChild(container);

    try {
        const created = getReactDOMClient().createRoot(container);
        created.render(<NotificationList />);
        root = { unmount: () => { created.unmount(); container.remove(); } };
    } catch {
        container.remove();
    }
}

export function unmountNotificationHost(): void {
    root?.unmount();
    root = null;
}
