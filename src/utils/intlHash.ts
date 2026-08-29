/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/**
 * `#{intl::KEY}` çözümlemesi (plan §5.7).
 *
 * Discord i18n anahtarlarını xxhash64 + base64 ile 6 karakterlik hash'e
 * çeviriyor. Bu dosya o algoritmayı runtime'da birebir taklit ediyor.
 */

/** Endianness kontrolü — Rust tarafı `to_ne_bytes()` kullanıyor. */
const IS_BIG_ENDIAN = (() => {
    const array = new Uint8Array(4);
    const view = new Uint32Array(array.buffer);
    return !((view[0] = 1) & array[0]);
})();

const MASK64 = (1n << 64n) - 1n;

const PRIME64_1 = 11400714785074694791n;
const PRIME64_2 = 14029467366897019727n;
const PRIME64_3 = 1609587929392839161n;
const PRIME64_4 = 9650029242287828579n;
const PRIME64_5 = 2870177450012600261n;

const mul = (a: bigint, b: bigint) => (a * b) & MASK64;
const add = (a: bigint, b: bigint) => (a + b) & MASK64;
const rotl = (value: bigint, bits: bigint) =>
    ((value << bits) | (value >> (64n - bits))) & MASK64;

function round(acc: bigint, input: bigint): bigint {
    acc = add(acc, mul(input, PRIME64_2));
    acc = rotl(acc, 31n);
    return mul(acc, PRIME64_1);
}

function mergeRound(acc: bigint, val: bigint): bigint {
    acc ^= round(0n, val);
    return add(mul(acc, PRIME64_1), PRIME64_4);
}

function avalanche(hash: bigint): bigint {
    hash ^= hash >> 33n;
    hash = mul(hash, PRIME64_2);
    hash ^= hash >> 29n;
    hash = mul(hash, PRIME64_3);
    hash ^= hash >> 32n;
    return hash;
}

/** XXH64, seed = 0. */
export function xxHash64(input: Uint8Array): bigint {
    const view = new DataView(input.buffer, input.byteOffset, input.byteLength);
    const length = input.length;

    let index = 0;
    let hash: bigint;

    if (length >= 32) {
        let v1 = add(add(0n, PRIME64_1), PRIME64_2);
        let v2 = add(0n, PRIME64_2);
        let v3 = 0n;
        let v4 = (0n - PRIME64_1) & MASK64;

        const limit = length - 32;
        do {
            v1 = round(v1, view.getBigUint64(index, true)); index += 8;
            v2 = round(v2, view.getBigUint64(index, true)); index += 8;
            v3 = round(v3, view.getBigUint64(index, true)); index += 8;
            v4 = round(v4, view.getBigUint64(index, true)); index += 8;
        } while (index <= limit);

        hash = add(add(add(rotl(v1, 1n), rotl(v2, 7n)), rotl(v3, 12n)), rotl(v4, 18n));
        hash = mergeRound(hash, v1);
        hash = mergeRound(hash, v2);
        hash = mergeRound(hash, v3);
        hash = mergeRound(hash, v4);
    } else {
        hash = add(0n, PRIME64_5);
    }

    hash = add(hash, BigInt(length));

    while (index + 8 <= length) {
        hash ^= round(0n, view.getBigUint64(index, true));
        hash = add(mul(rotl(hash, 27n), PRIME64_1), PRIME64_4);
        index += 8;
    }

    if (index + 4 <= length) {
        hash ^= mul(BigInt(view.getUint32(index, true)), PRIME64_1);
        hash = add(mul(rotl(hash, 23n), PRIME64_2), PRIME64_3);
        index += 4;
    }

    while (index < length) {
        hash ^= mul(BigInt(input[index]), PRIME64_5);
        hash = mul(rotl(hash, 11n), PRIME64_1);
        index += 1;
    }

    return avalanche(hash);
}

const encoder = new TextEncoder();

/**
 * Discord i18n anahtarının runtime karşılığı.
 *
 *   "MESSAGE_ACTIONS_LABEL"  →  6 karakterlik base64 hash
 */
export function runtimeHashMessageKey(key: string): string {
    const hash = xxHash64(encoder.encode(key));

    const bytes = new Uint8Array(8);
    // Rust tarafı `to_ne_bytes()` kullanıyor: platformun yerel sıralaması.
    new DataView(bytes.buffer).setBigUint64(0, hash, !IS_BIG_ENDIAN);

    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);

    return btoa(binary).slice(0, 6);
}
