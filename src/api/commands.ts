/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { Logger } from "../utils/logger";

const logger = new Logger("Api:Commands", "#f4b8e4");

export const enum ApplicationCommandOptionType {
    SUB_COMMAND = 1,
    SUB_COMMAND_GROUP = 2,
    STRING = 3,
    INTEGER = 4,
    BOOLEAN = 5,
    USER = 6,
    CHANNEL = 7,
    ROLE = 8,
    MENTIONABLE = 9,
    NUMBER = 10,
    ATTACHMENT = 11
}

export const enum ApplicationCommandInputType {
    BUILT_IN = 0,
    BUILT_IN_TEXT = 1,
    BUILT_IN_INTEGRATION = 2,
    BOT = 3,
    PLACEHOLDER = 4
}

export interface CommandOption {
    name: string;
    description: string;
    type: ApplicationCommandOptionType;
    required?: boolean;
    options?: CommandOption[];
    choices?: Array<{ label: string; value: string; name: string }>;
}

export interface CommandContext {
    channel: any;
    guild?: any;
}

export interface Command {
    /** `PluginManager` doldurur. */
    plugin?: string;
    id?: string;
    name: string;
    displayName?: string;
    description: string;
    displayDescription?: string;
    options?: CommandOption[];
    inputType?: ApplicationCommandInputType;
    execute(args: Array<{ name: string; value: any }>, ctx: CommandContext): any;
}

export const commands: Command[] = [];

/**
 * Discord'un yerleşik komut dizisi (`BUILT_IN_COMMANDS`). `CommandsAPI` plugin'i
 * bir kod patch'iyle bu diziyi yakalayıp buraya veriyor; sonra MCord komutları
 * hem `commands`'e hem doğrudan bu diziye ekleniyor — Discord komut menüsü kendi
 * dizisini okuduğu için ikisini senkron tutmak gerekiyor (referans katalog ile aynı).
 */
let builtInSink: Command[] | null = null;

export function _bindBuiltInCommands(sink: Command[]): void {
    if (!Array.isArray(sink)) return;
    builtInSink = sink;
    for (const command of commands) {
        if (!sink.some(existing => existing.name === command.name)) sink.push(command);
    }
}

export function registerCommand(command: Command, pluginName: string): void {
    if (commands.some(c => c.name === command.name)) {
        logger.warn(`${pluginName}: "${command.name}" komutu zaten kayıtlı, atlandı.`);
        return;
    }

    command.plugin = pluginName;
    command.id ??= `-mcord-${command.name}`;
    command.displayName ??= command.name;
    command.displayDescription ??= command.description;
    command.inputType ??= ApplicationCommandInputType.BUILT_IN_TEXT;
    command.options ??= [];

    commands.push(command);
    if (builtInSink && !builtInSink.some(c => c.name === command.name)) builtInSink.push(command);
}

export function unregisterCommand(name: string): boolean {
    const index = commands.findIndex(c => c.name === name);
    if (index === -1) return false;

    commands.splice(index, 1);

    const sinkIndex = builtInSink?.findIndex(c => c.name === name) ?? -1;
    if (sinkIndex !== -1) builtInSink!.splice(sinkIndex, 1);

    return true;
}

/** Bir argüman listesinden değer okur — plugin'lerin kullandığı yardımcı. */
export function findOption<T>(args: Array<{ name: string; value: any }>, name: string, fallback?: T): T {
    return (args.find(arg => arg.name === name)?.value ?? fallback) as T;
}
