/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/**
 * Renkli, rozetli konsol logger'ı. Her alt sistem kendi `Logger` örneğini
 * tutar; böylece konsolda hangi katmanın konuştuğu tek bakışta görünür.
 */
export class Logger {
    constructor(
        public readonly name: string,
        public readonly color: string = "#a0a0f0"
    ) { }

    private write(
        level: "log" | "info" | "warn" | "error" | "debug",
        levelColor: string,
        args: unknown[]
    ): void {
        console[level](
            `%c MCord %c ${this.name} `,
            `background:${levelColor};color:black;font-weight:bold;border-radius:4px 0 0 4px`,
            `background:${this.color};color:black;font-weight:bold;border-radius:0 4px 4px 0`,
            ...args
        );
    }

    log(...args: unknown[]): void { this.write("log", "#7be0a0", args); }
    info(...args: unknown[]): void { this.write("info", "#7bc0e0", args); }
    warn(...args: unknown[]): void { this.write("warn", "#e0c07b", args); }
    error(...args: unknown[]): void { this.write("error", "#e07b7b", args); }

    debug(...args: unknown[]): void {
        if (IS_DEV) this.write("debug", "#c0c0c0", args);
    }

    /** Alt sistem için türetilmiş logger — `Webpack` → `Webpack:Finder` */
    child(suffix: string): Logger {
        return new Logger(`${this.name}:${suffix}`, this.color);
    }
}
