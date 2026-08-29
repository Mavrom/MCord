/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { runtimeHashMessageKey } from "./intlHash";
import type { Patch, PatchReplacement, ReplaceFn } from "./types";

/**
 * Bir `match` ifadesini kanonik hale getirir (plan §5.7).
 *
 * İki dönüşüm uygulanır:
 *  1. `#{intl::KEY}` → Discord'un runtime i18n hash'i
 *  2. `\i` → `(?:[A-Za-z_$][\w$]*)` (sadece regex'lerde)
 *
 * Minified kodda değişken adları her build'de değiştiği için `\i` neredeyse
 * her patch'te lazım.
 */
export function canonicalizeMatch<T extends RegExp | string>(match: T): T {
    let partialCanon = typeof match === "string" ? match : match.source;

    partialCanon = partialCanon.replaceAll(/#{intl::([\w$+/]*)(?:::(\w+))?}/g, (_, key, modifier) => {
        const hashed = modifier === "raw" ? key : runtimeHashMessageKey(key);

        const isString = typeof match === "string";
        const hasSpecialChars = !Number.isNaN(Number(hashed[0]))
            || hashed.includes("+")
            || hashed.includes("/");

        if (hasSpecialChars) {
            return isString
                ? `["${hashed}"]`
                : String.raw`(?:\["${hashed}"\])`.replaceAll("+", "\\+");
        }

        return isString ? `.${hashed}` : String.raw`(?:\.${hashed})`;
    });

    if (typeof match === "string") {
        return partialCanon as T;
    }

    // Kaçış sayısı kontrolü: tek sayıda ters bölü varsa `\i` kaçırılmış demektir,
    // bir ters bölü düşürülüp literal bırakılıyor.
    const canonSource = partialCanon.replaceAll(/(\\*)\\i/g, (match, leadingEscapes) =>
        leadingEscapes.length % 2 === 0
            ? `${leadingEscapes}${String.raw`(?:[A-Za-z_$][\w$]*)`}`
            : match.slice(1)
    );

    const canonRegex = new RegExp(canonSource, match.flags);

    // Hata mesajlarında ve reporter çıktısında **orijinal** desen görünsün —
    // genişletilmiş `(?:[A-Za-z_$][\w$]*)` yığını okunmuyor.
    canonRegex.toString = match.toString.bind(match);

    return canonRegex as T;
}

/**
 * `$self` → plugin'in runtime yolu (plan §5.7).
 *
 *   $self.method(x)  →  Mcord.Plugins.plugins["MyPlugin"].method(x)
 */
export function canonicalizeReplace<T extends string | ReplaceFn>(replace: T, pluginPath: string): T {
    if (typeof replace !== "function") {
        return replace.replaceAll("$self", pluginPath) as T;
    }

    return ((...args: Parameters<ReplaceFn>) =>
        (replace as ReplaceFn)(...args).replaceAll("$self", pluginPath)) as T;
}

/** Plugin adından `$self`'in çözüleceği runtime yolunu üretir. */
export function pluginPathOf(pluginName: string): string {
    return `Mcord.Plugins.plugins[${JSON.stringify(pluginName)}]`;
}

/**
 * Descriptor üzerinden kanonikleştirme.
 *
 * Doğrudan `replacement.match = canonicalizeMatch(replacement.match)` yazmak
 * getter'lı tanımları bozar — bazı patch'ler `match`'i tembel hesaplamak için
 * getter olarak tanımlıyor. Descriptor'ı sarmalayınca tembellik korunuyor.
 */
export function canonicalizeDescriptor<T>(
    descriptor: TypedPropertyDescriptor<T>,
    canonicalize: (value: T) => T
): TypedPropertyDescriptor<T> {
    if (descriptor.get) {
        const original = descriptor.get;
        descriptor.get = function () {
            return canonicalize(original.call(this));
        };
    } else if (descriptor.value) {
        descriptor.value = canonicalize(descriptor.value);
    }

    return descriptor;
}

/** Bir replacement'ın `match` ve `replace` alanlarını **yerinde** kanonikleştirir. */
export function canonicalizeReplacement(
    replacement: Pick<PatchReplacement, "match" | "replace">,
    pluginPath: string
): void {
    const descriptors = Object.getOwnPropertyDescriptors(replacement);

    descriptors.match = canonicalizeDescriptor(descriptors.match, canonicalizeMatch);
    descriptors.replace = canonicalizeDescriptor(
        descriptors.replace,
        replace => canonicalizeReplace(replace, pluginPath)
    );

    Object.defineProperties(replacement, descriptors);
}

/** Bir patch'in `find` alanını **yerinde** kanonikleştirir. */
export function canonicalizeFind(patch: Patch): void {
    const descriptors = Object.getOwnPropertyDescriptors(patch);
    descriptors.find = canonicalizeDescriptor(descriptors.find, canonicalizeMatch);
    Object.defineProperties(patch, descriptors);
}

/** `find` ve tüm replacement'ları yerinde kanonikleştirir. */
export function canonicalizePatch(patch: Patch): Patch {
    const pluginPath = pluginPathOf(patch.plugin);

    canonicalizeFind(patch);

    const replacements = Array.isArray(patch.replacement) ? patch.replacement : [patch.replacement];
    for (const replacement of replacements) {
        canonicalizeReplacement(replacement, pluginPath);
    }

    patch.replacement = replacements;
    return patch;
}
