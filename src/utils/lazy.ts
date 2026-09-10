/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/**
 * Kanıtlanmış açık-kaynak istemcinin (Vencord) `src/utils/lazy.ts`'inin portu.
 *
 * MCord'un kendi tembel proxy'leri iki yerde bundan ayrılıyordu ve ikisi de
 * gerçek hataya yol açtı:
 *
 *  1. **Başarısız çözümleme kalıcı önbelleğe alınıyordu.** Burada `attempts`
 *     kez yeniden deneniyor: modül ilk erişimde henüz yüklenmemiş olabilir.
 *
 *  2. **Aynı tick'te yapılan property erişimi (destructuring) tembelliği
 *     iptal ediyordu.** `export const { zustandCreate } = mapMangledModuleLazy(…)`
 *     satırı modül yüklenirken Proxy'nin `get`'ini tetikliyor, o an ilgili
 *     webpack chunk'ı indirilmemiş oluyor ve "modül bulunamadı" uyarısı
 *     basılıyordu. Vencord bunu, aynı tick'teki erişimde **değeri değil yine
 *     bir tembel proxy** döndürerek çözüyor — destructuring beklendiği gibi
 *     çalışıyor, asıl çözümleme ilk gerçek kullanıma erteleniyor.
 */

export function makeLazy<T>(factory: () => T, attempts = 5): () => T {
    let tries = 0;
    let cache: T;
    return () => {
        if (cache === undefined && attempts > tries++) {
            cache = factory();
            if (cache === undefined && attempts === tries) {
                console.error("[MCord] Tembel fabrika başarısız:", factory);
            }
        }
        return cache;
    };
}

/** Proxy değişmezleri: bu özellikler hedeften değiştirilmeden dönmeli. */
const unconfigurable = ["arguments", "caller", "prototype"];

const handler: ProxyHandler<any> = {};

export const SYM_LAZY_GET = Symbol.for("mcord.lazy.get");
export const SYM_LAZY_CACHED = Symbol.for("mcord.lazy.cached");

for (const method of [
    "apply",
    "construct",
    "defineProperty",
    "deleteProperty",
    "getOwnPropertyDescriptor",
    "getPrototypeOf",
    "has",
    "isExtensible",
    "ownKeys",
    "preventExtensions",
    "set",
    "setPrototypeOf"
]) {
    (handler as any)[method] =
        (target: any, ...args: any[]) => (Reflect as any)[method](target[SYM_LAZY_GET](), ...args);
}

handler.ownKeys = target => {
    const value = target[SYM_LAZY_GET]();
    const keys = Reflect.ownKeys(value);
    for (const key of unconfigurable) {
        if (!keys.includes(key)) keys.push(key);
    }
    return keys;
};

handler.getOwnPropertyDescriptor = (target, p) => {
    if (typeof p === "string" && unconfigurable.includes(p)) {
        return Reflect.getOwnPropertyDescriptor(target, p);
    }

    const descriptor = Reflect.getOwnPropertyDescriptor(target[SYM_LAZY_GET](), p);
    if (descriptor) Object.defineProperty(target, p, descriptor);
    return descriptor;
};

/**
 * `makeLazy` sonucunu, tembel olmadığı gibi kullanabileceğin bir Proxy'ye sarar.
 * İlk **gerçek** property erişiminde çözülür.
 *
 * @param attempts çözümleme kaç kez denensin
 */
export function proxyLazy<T>(factory: () => T, attempts = 5, isChild = false): T {
    let isSameTick = true;
    if (!isChild) setTimeout(() => isSameTick = false, 0);

    let tries = 0;
    const proxyDummy = Object.assign(function () { }, {
        [SYM_LAZY_CACHED]: void 0 as T | undefined,
        [SYM_LAZY_GET]() {
            if (!proxyDummy[SYM_LAZY_CACHED] && attempts > tries++) {
                proxyDummy[SYM_LAZY_CACHED] = factory();
                if (!proxyDummy[SYM_LAZY_CACHED] && attempts === tries) {
                    console.error("[MCord] Tembel fabrika başarısız:", factory);
                }
            }
            return proxyDummy[SYM_LAZY_CACHED];
        }
    });

    return new Proxy(proxyDummy, {
        ...handler,
        get(target, p, receiver) {
            if (p === SYM_LAZY_CACHED || p === SYM_LAZY_GET) {
                return Reflect.get(target, p, receiver);
            }

            // Hâlâ aynı tick'teysek tembel hemen kullanılmış demektir (tipik
            // olarak modül kapsamında destructuring). Erişimin kendisini de
            // tembelleştiriyoruz ki `const { x } = findByPropsLazy("x")` beklendiği
            // gibi çalışsın — `x` de bir tembel olur.
            if (!isChild && isSameTick) {
                return proxyLazy(
                    () => Reflect.get(target[SYM_LAZY_GET](), p, receiver),
                    attempts,
                    true
                );
            }

            const lazyTarget = target[SYM_LAZY_GET]();
            if (typeof lazyTarget === "object" || typeof lazyTarget === "function") {
                return Reflect.get(lazyTarget, p, receiver);
            }
            throw new Error("[MCord] proxyLazy ilkel bir değer üzerinde çağrıldı.");
        }
    }) as any;
}
