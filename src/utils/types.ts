/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import type { BoundPatcher } from "../patcher/boundPatcher";

export type ReplaceFn = (match: string, ...groups: string[]) => string;

export interface PatchReplacement {
    /** Aranacak parça. Regex'te `\i` = herhangi bir JS tanımlayıcısı (plan §5.7). */
    match: string | RegExp;
    /** Yerine konacak. `$self` plugin'in runtime yoluna çevrilir. */
    replace: string | ReplaceFn;
    /** Koşullu replacement — `false` dönerse atlanır. */
    predicate?(): boolean;
    /** Eşleşmediğinde uyarı basma. */
    noWarn?: boolean;
}

export interface Patch {
    /** `PluginManager` tarafından doldurulur. */
    plugin: string;

    /** Hedef modülü bulmak için: string ise `includes`, regex ise `test`. */
    find: string | RegExp;

    /**
     * **Zorunlu gerekçe** (plan §5.1).
     *
     * Kod patch'i sadece fonksiyon patch'inin yetmediği yerde kullanılır.
     * Bu alan ESLint kuralıyla zorunlu kılınmıştır — geliştirici gerekçe yazmak
     * zorunda kalınca çoğu zaman fonksiyon patch'iyle çözmenin yolunu buluyor.
     */
    reason: string;

    replacement: PatchReplacement | PatchReplacement[];

    /** Birden fazla modüle uygulanabilir; uygulandıktan sonra listeden düşmez. */
    all?: boolean;
    /** Hiçbir modüle uymadığında uyarı basma. */
    noWarn?: boolean;
    /**
     * Grup: replacement'lardan biri tutmazsa **tümü** geri alınır.
     * Yarım uygulanmış patch, hiç uygulanmamış patch'ten tehlikeli (plan §5.6).
     */
    group?: boolean;
    /** Koşullu patch. */
    predicate?(): boolean;

    /** Discord build aralığı — dışındaysa patch listeden tamamen çıkarılır. */
    fromBuild?: number;
    toBuild?: number;
}

/** Kaynağı henüz kanonikleştirilmemiş, plugin tanımındaki ham hali. */
export type PatchDefinition = Omit<Patch, "plugin">;

// ── Plugin tanımı (plan §6.3) ────────────────────────────────────────────────

/** Yaşam döngüsü aşamaları (plan §6.4). */
export const enum StartAt {
    /** Modül yüklenir yüklenmez — webpack öncesi hazırlık. */
    Init = "Init",
    /** Webpack hazır (varsayılan) — ana plugin başlatma. */
    WebpackReady = "WebpackReady",
    /** DOM hazır — UI enjeksiyonu. */
    DOMContentLoaded = "DOMContentLoaded",
    /**
     * `UserStore` hazır veya `CONNECTION_OPEN` dispatch edildi.
     * Kullanıcı verisine ihtiyaç duyan pluginler için; `setTimeout`
     * tahminlerine gerek bırakmıyor (plan §6.4).
     */
    ConnectionOpen = "ConnectionOpen"
}

export interface Author {
    name: string;
    id: bigint;
}

export const enum OptionType {
    STRING = "STRING",
    NUMBER = "NUMBER",
    BIGINT = "BIGINT",
    BOOLEAN = "BOOLEAN",
    SELECT = "SELECT",
    SLIDER = "SLIDER",
    COMPONENT = "COMPONENT",
    CUSTOM = "CUSTOM"
}

interface BaseSetting<T> {
    description: string;
    /** Yeniden başlatma gerektiriyor mu. */
    restartNeeded?: boolean;
    /** Değer değiştiğinde çağrılır. */
    onChange?(newValue: T): void;
    /** Değeri doğrula — string dönerse hata mesajı olarak gösterilir. */
    isValid?(value: T): boolean | string;
    /**
     * UI'da gizle. Fonksiyon da olabilir — koşullu ayarlar için (plan §7.1).
     */
    hidden?: boolean | (() => boolean);
    /** UI'da devre dışı bırak. Fonksiyon da olabilir. */
    disabled?: boolean | (() => boolean);
}

export interface StringSetting extends BaseSetting<string> {
    type: OptionType.STRING;
    default?: string;
    placeholder?: string;
}

export interface NumberSetting extends BaseSetting<number> {
    type: OptionType.NUMBER | OptionType.BIGINT;
    default?: number;
}

export interface BooleanSetting extends BaseSetting<boolean> {
    type: OptionType.BOOLEAN;
    default?: boolean;
}

export interface SelectOption<T = string> {
    label: string;
    value: T;
    default?: boolean;
}

export interface SelectSetting<T = string> extends BaseSetting<T> {
    type: OptionType.SELECT;
    options: SelectOption<T>[];
}

export interface SliderSetting extends BaseSetting<number> {
    type: OptionType.SLIDER;
    markers: number[];
    default?: number;
    stickToMarkers?: boolean;
}

export interface ComponentSetting extends BaseSetting<any> {
    type: OptionType.COMPONENT;
    component: (props: { setValue(value: any): void; setError(error: string | null): void; option: ComponentSetting }) => any;
    default?: any;
}

export interface CustomSetting<T = any> extends BaseSetting<T> {
    type: OptionType.CUSTOM;
    default?: T;
}

export type PluginSetting =
    | StringSetting
    | NumberSetting
    | BooleanSetting
    | SelectSetting<any>
    | SliderSetting
    | ComponentSetting
    | CustomSetting;

export type SettingsDefinition = Record<string, PluginSetting>;

/** Ayar tanımından türeyen, tip güvenli değer nesnesi (plan §7.1). */
export type SettingsStore<D extends SettingsDefinition> = {
    [K in keyof D]:
    D[K] extends BooleanSetting ? boolean :
    D[K] extends StringSetting ? string :
    D[K] extends NumberSetting ? number :
    D[K] extends SliderSetting ? number :
    D[K] extends SelectSetting<infer V> ? V :
    any;
};

export interface DefinedSettings<D extends SettingsDefinition = SettingsDefinition> {
    readonly def: D;
    readonly store: SettingsStore<D>;
    /** `PluginManager` tarafından doldurulur. */
    pluginName: string;
    withPrivateSettings<T extends object>(): SettingsStore<D> & T;
}

export type FluxHandler = (event: any) => void | Promise<void>;

export interface PluginDef {
    name: string;
    description: string;
    authors: Author[];
    tags?: string[];

    /** Otomatik etkinleştirilen bağımlılıklar (plan §6.3). */
    dependencies?: string[];

    /** Kullanıcı kapatamaz — `_core` ve `_api` pluginleri. */
    required?: boolean;
    /** Varsayılan olarak açık başlar. */
    enabledByDefault?: boolean;

    startAt?: StartAt;
    start?(): void | Promise<void>;
    stop?(): void | Promise<void>;

    patches?: PatchDefinition[];

    /** Flux olayları — otomatik abone/çıkış (plan §6.5). */
    flux?: Record<string, FluxHandler>;

    /** UI kancaları — otomatik kayıt/silme (plan §6.5). */
    contextMenus?: Record<string, (children: any, props: any) => void>;
    commands?: any[];
    managedStyle?: string;
    onBeforeMessageSend?(channelId: string, message: any): void | Promise<void>;
    onBeforeMessageEdit?(channelId: string, messageId: string, message: any): void | Promise<void>;
    onMessageClick?(message: any, channel: any, event: any): void;
    /** Sohbet çubuğuna düğme ekler — `PluginManager` kaydı/silmeyi üstlenir (plan §6.5). */
    chatBarButton?: (props: Record<string, any>) => any;
    /** Mesajlara süsleme ekler — `PluginManager` kaydı/silmeyi üstlenir (plan §6.5). */
    renderMessageDecoration?: (props: Record<string, any>) => any;

    settings?: DefinedSettings<any>;

    /** `patches` varsa otomatik `true` (plan §7.3). */
    requiresRestart?: boolean;
}

/** `PluginManager` tarafından zenginleştirilmiş çalışma zamanı hali. */
export interface Plugin extends PluginDef {
    started: boolean;
    isDependency?: boolean;
    /** Plugin'e bağlı patcher — framework tarafından verilir (plan §5.3). */
    patcher: BoundPatcher;
}

/**
 * Plugin tanımlama yardımcısı.
 *
 * `name` **ilk özellik ve düz string** olmak zorunda: build sırasında
 * `globPlugins` regex'i buradan okuyor, eşleşmezse build patlıyor (plan §6.1).
 */
export function definePlugin<P extends PluginDef>(
    plugin: P & Record<string, unknown> & ThisType<P & Plugin>
): P {
    return plugin;
}
