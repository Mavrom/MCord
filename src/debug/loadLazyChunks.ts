/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import pLimit from "p-limit";

import { Logger } from "../utils/logger";
import { canonicalizeMatch } from "../utils/patches";
import { ChunkIdsRegex } from "../webpack/filters";
import { factoryListeners, wreq } from "../webpack/intercept";
import type { ModuleFactory } from "../webpack/types";

const logger = new Logger("Reporter:LazyChunks", "#ca9ee6");

/**
 * Discord'un tembel yüklediği tüm chunk'ları zorla yükler (plan §9.1).
 *
 * Worker ve chunk haritası istisnaları bilinçli: bu iki chunk türü zorla
 * yüklenince hata veriyor, listeden çıkarılıyorlar (plan §16).
 */

/**
 * Discord'un asset dosyasına eşlediği **tüm** chunk'ların haritası.
 *
 * `wreq.u` içindeki chunk→dosya nesnesine doğrudan erişemiyoruz; `Object.prototype`
 * üzerine geçici bir sembol getter'ı koyup `wreq.u(sym)` çağırınca `this` bize
 * o nesneyi veriyor.
 */
function getWebpackChunkMap(): Record<PropertyKey, string> | null {
    const sym = Symbol();
    let chunksMap: unknown = null;

    Object.defineProperty(Object.prototype, sym, {
        get() {
            chunksMap = this;
            return "";
        },
        configurable: true
    });

    wreq.u(sym);
    delete (Object.prototype as any)[sym];

    return chunksMap as Record<PropertyKey, string> | null;
}

let chunksAlreadyLoaded = false;

export async function loadLazyChunks(): Promise<void> {
    if (chunksAlreadyLoaded) {
        logger.log("Tembel chunk'lar zaten yüklendi.");
        return;
    }

    // Eşzamanlı fetch sayısı sınırlı: binlerce chunk'ı aynı anda çekmek
    // tarayıcıyı boğuyor.
    const queue = pLimit(50);

    const workerAssetCache = new Map<string, Promise<boolean>>();
    const WORKER_ASSET_REGEX = /importScripts\(|self\.postMessage/;

    async function isWorkerAsset(url: string, useQueue = true): Promise<boolean> {
        const cached = workerAssetCache.get(url);
        if (cached) return cached;

        const doFetch = () => fetch(url)
            .then(r => r.text())
            .then(t => WORKER_ASSET_REGEX.test(t))
            .catch(() => true);

        const result = useQueue ? queue(doFetch) : doFetch();
        workerAssetCache.set(url, result);
        return result;
    }

    try {
        logger.log("Tüm chunk'lar yükleniyor…");

        const validChunks = new Set<PropertyKey>();
        const invalidChunks = new Set<PropertyKey>();
        const deferredRequires = new Set<PropertyKey>();

        const { promise: chunkSearchingDone, resolve: chunkSearchingDoneResolve } =
            Promise.withResolvers<void>();

        // Çözülen arama söz getter'ları; dizi boşalınca tüm tarama bitmiş demektir.
        let chunkSearchResolvedGetters: Array<() => boolean> = [];

        const LazyChunkRegex = canonicalizeMatch(
            /(?:(?:Promise\.all\(\[)?((?:\i\.e\("?[^)]+?"?\),?)+?)(?:\]\))?)\.then\(\i\.bind\(\i,"?([^)]+?)"?\)\)/g
        );

        async function searchAndLoadLazyChunks(factoryCode: string): Promise<void> {
            const lazyChunks = factoryCode.matchAll(LazyChunkRegex);
            const validChunkGroups = new Set<[chunkIds: PropertyKey[], entryPoint: PropertyKey]>();

            await Promise.all([...lazyChunks].map(async ([, rawChunkIds, entryPoint]) => {
                const chunkIds = rawChunkIds
                    ? [...rawChunkIds.matchAll(ChunkIdsRegex)].map(m => {
                        const numChunkId = Number(m[1]);
                        return Number.isNaN(numChunkId) ? m[1] : String(numChunkId);
                    })
                    : [];

                if (chunkIds.length === 0) return;

                let invalidChunkGroup = false;

                for (const id of chunkIds) {
                    if (wreq.u(id) == null || wreq.u(id) === "undefined.js") continue;

                    // Worker asset'leri ana thread'de yüklenemez.
                    if (await isWorkerAsset(wreq.p + wreq.u(id))) {
                        invalidChunks.add(id);
                        invalidChunkGroup = true;
                        continue;
                    }

                    validChunks.add(id);
                }

                if (!invalidChunkGroup) {
                    const numEntryPoint = Number(entryPoint);
                    validChunkGroups.add([
                        chunkIds,
                        Number.isNaN(numEntryPoint) ? entryPoint : String(numEntryPoint)
                    ]);
                }
            }));

            await Promise.all(
                [...validChunkGroups].map(([chunkIds]) =>
                    Promise.all(chunkIds.map(id => wreq.e(id as any))))
            );

            for (const [, entryPoint] of validChunkGroups) {
                try {
                    if (wreq.m[entryPoint as any]) wreq(entryPoint);
                } catch (err) {
                    if (err instanceof TypeError && err.message.includes("reading 'nativeModules'")) {
                        continue;
                    }
                    logger.debug("Giriş noktası require edilemedi:", err);
                }
            }

            // `setTimeout(…, 0)` şart: bu çağrının kendi tetiklediği aramaların da
            // diziye eklenmesine fırsat veriyor, yoksa erken "bitti" diyoruz.
            setTimeout(() => {
                chunkSearchResolvedGetters = chunkSearchResolvedGetters.filter(
                    isResolved => !isResolved()
                );
                if (chunkSearchResolvedGetters.length === 0) chunkSearchingDoneResolve();
            }, 0);
        }

        function factoryListener(factory: ModuleFactory): void {
            let isResolved = false;
            void searchAndLoadLazyChunks(String(factory)).finally(() => { isResolved = true; });
            chunkSearchResolvedGetters.push(() => isResolved);
        }

        // Yeni chunk'lar yüklendikçe gelen fabrikalar da taranıyor — olay tabanlı,
        // yoklama döngüsü değil.
        factoryListeners.add(factoryListener);
        for (const moduleId in wreq.m) {
            factoryListener(wreq.m[moduleId]);
        }

        await chunkSearchingDone;
        factoryListeners.delete(factoryListener);

        for (const deferredRequire of deferredRequires) {
            wreq(deferredRequire);
        }

        // Regex'in yakalayamadığı chunk'lar: Discord'un asset'e eşlediği tüm
        // chunk'ları alıp kalanları da yüklüyoruz. Bu adım olmadan reporter'ın
        // gördüğü modül kümesi ciddi biçimde eksik kalıyor.
        const chunksMap = getWebpackChunkMap();
        if (!chunksMap) throw new Error("Chunk haritası alınamadı");

        const allChunks = Object.keys(chunksMap);
        if (allChunks.length === 0) throw new Error("Chunk listesi boş");

        const chunksLeft = allChunks.filter(id => !(validChunks.has(id) || invalidChunks.has(id)));

        await Promise.all(chunksLeft.map(id => queue(async () => {
            // Kuyruk içinde kuyruk kullanmak kilitlenmeye yol açar.
            const isWorkerFile = await isWorkerAsset(wreq.p + wreq.u(id), false);
            if (!isWorkerFile) await wreq.e(id);
        })));

        logger.log(
            `Tüm chunk'lar yüklendi — ${validChunks.size} geçerli, ` +
            `${invalidChunks.size} atlanan, ${chunksLeft.length} haritadan tamamlanan.`
        );
        chunksAlreadyLoaded = true;
    } catch (err) {
        logger.error("Ölümcül hata:", err);
    }
}
