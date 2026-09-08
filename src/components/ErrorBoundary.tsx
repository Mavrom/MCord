/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Logger } from "../utils/logger";
import { React } from "../webpack/react";

const logger = new Logger("ErrorBoundary", "#e78284");

interface Props {
    /** `noop` ise hata anında `null` döner (sessiz). Aksi halde küçük kart. */
    noop?: boolean;
    fallback?: React.ComponentType<{ error: unknown }>;
    onError?(error: unknown, info: unknown): void;
    children?: React.ReactNode;
}

interface State {
    error: unknown;
}

/**
 * Plugin-içi hata sınırı. Bir bileşen çökerse Discord'un tamamını değil sadece
 * o parçayı düşürür.
 *
 *   ErrorBoundary.wrap(MyComponent)
 *   ErrorBoundary.wrap(myRenderFn, { noop: true })
 */
class ErrorBoundaryImpl extends React.Component<Props, State> {
    override state: State = { error: null };

    static getDerivedStateFromError(error: unknown): State {
        return { error };
    }

    override componentDidCatch(error: unknown, info: unknown): void {
        logger.error("Sınır bir hata yakaladı:\n", error, info);
        try {
            this.props.onError?.(error, info);
        } catch { /* onError kendisi patlarsa yut */ }
    }

    override render(): React.ReactNode {
        if (this.state.error == null) return this.props.children;
        if (this.props.noop) return null;

        if (this.props.fallback) {
            return React.createElement(this.props.fallback, { error: this.state.error });
        }

        return React.createElement(
            "div",
            {
                style: {
                    color: "var(--text-danger, #f23f43)",
                    fontSize: "12px",
                    padding: "6px 8px",
                    border: "1px solid var(--status-danger, #f23f43)",
                    borderRadius: "4px",
                    background: "color-mix(in srgb, var(--status-danger, #f23f43) 8%, transparent)"
                }
            },
            "Bu MCord bileşeni hata verdi (konsola bakın)."
        );
    }
}

type Wrappable = React.ComponentType<any> | ((props: any) => React.ReactNode);

export const ErrorBoundary = Object.assign(ErrorBoundaryImpl, {
    /** Bir bileşeni/fonksiyonu hata sınırıyla sar. */
    wrap<T extends Wrappable>(Component: T, options: Omit<Props, "children"> = {}): T {
        const Wrapped = (props: any) =>
            React.createElement(
                ErrorBoundaryImpl,
                options as Props,
                React.createElement(Component as any, props)
            );
        (Wrapped as any).displayName = `ErrorBoundary(${(Component as any).displayName ?? (Component as any).name ?? "Component"})`;
        return Wrapped as unknown as T;
    }
});

export default ErrorBoundary;
