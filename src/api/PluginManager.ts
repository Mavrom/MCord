/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import pluginDefs from "~plugins";

import { BoundPatcher } from "../patcher/boundPatcher";
import { Logger } from "../utils/logger";
import { type Plugin, type PluginDef, StartAt } from "../utils/types";
import { addPatch } from "../webpack/codePatcher";
import { byKeys } from "../webpack/filters";
import { find } from "../webpack/finder";
import {
    addChatBarButton,
    addMessageDecoration,
    removeChatBarButton,
    removeMessageDecoration
} from "./chatComponents";
import { registerCommand, unregisterCommand } from "./commands";
import { addContextMenuPatch, removeContextMenuPatch } from "./contextMenu";
import { addMessageAccessory, removeMessageAccessory } from "./messageAccessories";
import {
    addMessageClickListener,
    addMessagePreEditListener,
    addMessagePreSendListener,
    removeMessageClickListener,
    removeMessagePreEditListener,
    removeMessagePreSendListener
} from "./messageEvents";
import { addMessagePopoverButton, removeMessagePopoverButton } from "./messagePopover";
import { Settings } from "./settings";
import { disableStyle, enableStyle } from "./styles";

const logger = new Logger("PluginManager", "#e5c890");

export const plugins = pluginDefs as unknown as Record<string, Plugin>;

/** Adı → plugin, başlatma sırasına göre. */
const startOrder: Plugin[] = [];
const messageEventBindings = new WeakMap<Plugin, {
    click?: (...args: any[]) => void;
    edit?: (...args: any[]) => void | Promise<void>;
    send?: (...args: any[]) => void | Promise<void>;
}>();

function getFluxDispatcher(): any {
    return find(byKeys(["dispatch", "subscribe", "_subscriptions"]), { silent: true });
}

// ── Etkinlik ─────────────────────────────────────────────────────────────────

export function isPluginEnabled(name: string): boolean {
    const plugin = plugins[name];
    if (!plugin) return false;

    // `_api` ve `_core` pluginleri kapatılamaz.
    if (plugin.required) return true;
    if (Settings.safeMode) return false;

    const stored = Settings.plugins[name]?.enabled;
    return typeof stored === "boolean" ? stored : (plugin.enabledByDefault ?? false);
}

export function setPluginEnabled(name: string, enabled: boolean): void {
    const plugin = plugins[name];
    if (!plugin || plugin.required) return;

    Settings.plugins[name] ??= {};
    Settings.plugins[name].enabled = enabled;
}

/**
 * Kod patch'i olan plugin otomatik yeniden başlatma gerektiriyor — patch'ler
 * modül yüklenirken uygulanıyor, sonradan geri alınamıyor (plan §7.3).
 */
export function pluginRequiresRestart(plugin: PluginDef): boolean {
    return plugin.requiresRestart !== false
        && (plugin.requiresRestart === true || !!plugin.patches?.length);
}

// ── Başlatma ─────────────────────────────────────────────────────────────────

/** Plugin'leri hazırlar ve etkin olanların kod patch'lerini kaydeder. */
export function initPlugins(): void {
    for (const name in plugins) {
        const plugin = plugins[name];

        if (plugin.name !== name) {
            logger.error(`Plugin adı tutarsız: klasör "${name}", tanım "${plugin.name}".`);
        }

        plugin.started = false;
        plugin.patcher = new BoundPatcher(name);

        if (plugin.settings) plugin.settings.pluginName = name;
    }

    resolveDependencies();

    for (const name in plugins) {
        const plugin = plugins[name];
        if (!isPluginEnabled(name)) continue;

        for (const patch of plugin.patches ?? []) {
            addPatch(patch, name);
        }
    }

    logger.info(
        `${Object.keys(plugins).length} plugin yüklendi, ` +
        `${Object.keys(plugins).filter(isPluginEnabled).length} etkin.`
    );
}

/** Bağımlılıklar otomatik etkinleştirilir (plan §6.3). */
function resolveDependencies(): void {
    for (const name in plugins) {
        if (!isPluginEnabled(name)) continue;

        for (const dependency of plugins[name].dependencies ?? []) {
            const target = plugins[dependency];

            if (!target) {
                logger.error(`${name}: "${dependency}" bağımlılığı bulunamadı.`);
                continue;
            }

            if (!isPluginEnabled(dependency)) {
                logger.info(`${name} için "${dependency}" otomatik etkinleştirildi.`);
                setPluginEnabled(dependency, true);
            }

            target.isDependency = true;
        }
    }
}

/** Verilen aşamaya ait tüm etkin pluginleri başlatır (plan §6.4). */
export async function startAllPluginsAt(target: StartAt): Promise<void> {
    for (const name in plugins) {
        const plugin = plugins[name];

        if (!isPluginEnabled(name)) continue;
        if (plugin.started) continue;
        if ((plugin.startAt ?? StartAt.WebpackReady) !== target) continue;

        await startPlugin(plugin);
    }
}

/**
 * Simetri kuralı (plan §6.5): plugin'in tanımladığı her kanca başlatmada
 * kaydediliyor, durdurmada siliniyor. Listeye `patcher` ve `nodePatcher` de
 * dahil — BD'de bu manuel ve unutuluyor.
 */
export async function startPlugin(plugin: Plugin): Promise<boolean> {
    const { name } = plugin;

    if (plugin.started) return true;

    try {
        for (const dependency of plugin.dependencies ?? []) {
            const target = plugins[dependency];
            if (target && !target.started) await startPlugin(target);
        }

        if (plugin.commands) {
            for (const command of plugin.commands) registerCommand(command, name);
        }

        if (plugin.contextMenus) {
            for (const navId in plugin.contextMenus) {
                addContextMenuPatch(navId, plugin.contextMenus[navId]);
            }
        }

        if (plugin.flux) subscribeFlux(plugin);

        if (plugin.managedStyle) enableStyle(name, plugin.managedStyle);

        const eventBindings: {
            click?: (...args: any[]) => void;
            edit?: (...args: any[]) => void | Promise<void>;
            send?: (...args: any[]) => void | Promise<void>;
        } = {};

        if (plugin.onBeforeMessageSend) {
            eventBindings.send = plugin.onBeforeMessageSend.bind(plugin);
            addMessagePreSendListener(eventBindings.send as any);
        }

        if (plugin.onBeforeMessageEdit) {
            eventBindings.edit = plugin.onBeforeMessageEdit.bind(plugin);
            addMessagePreEditListener(eventBindings.edit as any);
        }

        if (plugin.onMessageClick) {
            eventBindings.click = plugin.onMessageClick.bind(plugin);
            addMessageClickListener(eventBindings.click as any);
        }

        if (Object.keys(eventBindings).length) messageEventBindings.set(plugin, eventBindings);

        if (plugin.chatBarButton) addChatBarButton(name, plugin.chatBarButton.bind(plugin));
        if (plugin.messagePopoverButton) addMessagePopoverButton(name, plugin.messagePopoverButton.bind(plugin));
        if (plugin.renderMessageAccessory) {
            addMessageAccessory(name, plugin.renderMessageAccessory.bind(plugin), plugin.messageAccessoryPosition);
        }
        if (plugin.renderMessageDecoration) {
            addMessageDecoration(name, plugin.renderMessageDecoration.bind(plugin));
        }

        await plugin.start?.();

        plugin.started = true;
        startOrder.push(plugin);

        logger.debug(`${name} başlatıldı.`);
        return true;
    } catch (err) {
        logger.error(`${name} başlatılamadı:\n`, err);

        // Yarım başlatılmış plugin bırakma.
        try {
            await stopPlugin(plugin);
        } catch { /* zaten hatalı */ }

        return false;
    }
}

export async function stopPlugin(plugin: Plugin): Promise<boolean> {
    const { name } = plugin;

    try {
        await plugin.stop?.();
    } catch (err) {
        logger.error(`${name} durdurma fonksiyonu hata verdi:\n`, err);
    }

    try {
        if (plugin.commands) {
            for (const command of plugin.commands) unregisterCommand(command.name);
        }

        if (plugin.contextMenus) {
            for (const navId in plugin.contextMenus) {
                removeContextMenuPatch(navId, plugin.contextMenus[navId]);
            }
        }

        if (plugin.flux) unsubscribeFlux(plugin);

        if (plugin.managedStyle) disableStyle(name);

        const eventBindings = messageEventBindings.get(plugin);
        if (eventBindings?.send) removeMessagePreSendListener(eventBindings.send as any);
        if (eventBindings?.edit) removeMessagePreEditListener(eventBindings.edit as any);
        if (eventBindings?.click) removeMessageClickListener(eventBindings.click as any);
        messageEventBindings.delete(plugin);

        if (plugin.chatBarButton) removeChatBarButton(name);
        if (plugin.messagePopoverButton) removeMessagePopoverButton(name);
        if (plugin.renderMessageAccessory) removeMessageAccessory(name);
        if (plugin.renderMessageDecoration) removeMessageDecoration(name);

        // Framework hallediyor, plugin yazarının sorumluluğunda değil (plan §5.3).
        plugin.patcher?.destroy();
        plugin.patcher = new BoundPatcher(name);

        plugin.started = false;

        const index = startOrder.indexOf(plugin);
        if (index !== -1) startOrder.splice(index, 1);

        logger.debug(`${name} durduruldu.`);
        return true;
    } catch (err) {
        logger.error(`${name} durdurulurken hata:\n`, err);
        return false;
    }
}

/** Tüm pluginleri başlatma sırasının tersinden durdurur. */
export async function stopAllPlugins(): Promise<void> {
    for (const plugin of [...startOrder].reverse()) {
        await stopPlugin(plugin);
    }
}

// ── Flux ─────────────────────────────────────────────────────────────────────

const fluxHandlers = new WeakMap<Plugin, Record<string, (event: any) => void>>();

/**
 * Her handler try/catch'e ve Promise `.catch`'e sarılıyor: bir plugin'in flux
 * handler'ı patlarsa Discord'un dispatcher'ı kilitlenmiyor (plan §6.5).
 */
function subscribeFlux(plugin: Plugin): void {
    const dispatcher = getFluxDispatcher();
    if (!dispatcher) {
        logger.error(`${plugin.name}: FluxDispatcher bulunamadı, flux abonelikleri atlandı.`);
        return;
    }

    const wrapped: Record<string, (event: any) => void> = {};

    for (const event in plugin.flux!) {
        const handler = plugin.flux![event];

        wrapped[event] = function (this: unknown, ...args: [any]) {
            try {
                const result = handler.apply(plugin, args);
                return result instanceof Promise
                    ? result.catch(err =>
                        logger.error(`${plugin.name}: "${event}" işlenirken hata\n`, err))
                    : result;
            } catch (err) {
                logger.error(`${plugin.name}: "${event}" işlenirken hata\n`, err);
            }
        };

        dispatcher.subscribe(event, wrapped[event]);
    }

    fluxHandlers.set(plugin, wrapped);
}

function unsubscribeFlux(plugin: Plugin): void {
    const dispatcher = getFluxDispatcher();
    const wrapped = fluxHandlers.get(plugin);

    if (!dispatcher || !wrapped) return;

    for (const event in wrapped) {
        dispatcher.unsubscribe(event, wrapped[event]);
    }

    fluxHandlers.delete(plugin);
}
