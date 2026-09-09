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
 * Sınıf **tembel** kuruluyor.
 *
 * `class X extends React.Component` ifadesi modül yüklenirken değerlendirilir;
 * `webpack/react`'teki `React` bir Proxy ve Discord'un React'i henüz hazır
 * değilken FIRLATIR. Eski sürüm bu yüzden `/login` ekranında renderer'ı
 * komple çökertiyordu (`[MCord] Discord'un React'i bulunamadı`). İlk render'a
 * kadar beklersek React garanti hazır oluyor.
 */
let Impl: any = null;

function getImpl(): any {
    if (Impl != null) return Impl;

    Impl = class ErrorBoundaryImpl extends (React as any).Component<Props, State> {
        state: State = { error: null };

        static getDerivedStateFromError(error: unknown): State {
            return { error };
        }

        componentDidCatch(error: unknown, info: unknown): void {
            logger.error("Sınır bir hata yakaladı:\n", error, info);
            try {
                (this as any).props.onError?.(error, info);
            } catch { /* onError kendisi patlarsa yut */ }
        }

        render(): React.ReactNode {
            const { props, state } = this as any;
            if (state.error == null) return props.children;
            if (props.noop) return null;

            if (props.fallback) {
                return React.createElement(props.fallback, { error: state.error });
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
    };

    return Impl;
}

/** JSX'te doğrudan kullanılabilen sarmalayıcı: `<ErrorBoundary>…</ErrorBoundary>`. */
function ErrorBoundaryComponent(props: Props): React.ReactNode {
    return React.createElement(getImpl(), props, props.children);
}

type Wrappable = React.ComponentType<any> | ((props: any) => React.ReactNode);

export const ErrorBoundary = Object.assign(ErrorBoundaryComponent, {
    /** Bir bileşeni/fonksiyonu hata sınırıyla sar. */
    wrap<T extends Wrappable>(Component: T, options: Omit<Props, "children"> = {}): T {
        const Wrapped = (props: any) =>
            React.createElement(
                getImpl(),
                options as Props,
                React.createElement(Component as any, props)
            );
        (Wrapped as any).displayName = `ErrorBoundary(${(Component as any).displayName ?? (Component as any).name ?? "Component"})`;
        return Wrapped as unknown as T;
    }
});

export default ErrorBoundary;
