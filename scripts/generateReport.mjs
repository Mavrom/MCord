/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

/**
 * Reporter CI koşusu (plan §9.2).
 *
 *   pnpm buildReporter && node scripts/generateReport.mjs --branch=both
 *
 * Ortam değişkenleri:
 *   CHROMIUM_BIN    Puppeteer'ın kullanacağı Chromium (CI'da zorunlu)
 *   WEBHOOK_URL     İsteğe bağlı; verilirse sonuç Discord webhook'una gönderilir
 *   WEBHOOK_SECRET  İsteğe bağlı; verilirse gövde HMAC-SHA256 ile imzalanır
 *
 * Giriş YOK — Discord'un `/login` sayfası tüm webpack bundle'ını yüklüyor;
 * `loadLazyChunks` kalan chunk'ları zorla çekiyor. Token gerekmiyor, hiçbir
 * kişisel veri kullanılmıyor.
 */

import { createHmac } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import puppeteer from "puppeteer-core";

import { DIST, PackageJson, ROOT } from "./build/common.mjs";

const BRANCHES = {
    stable: "https://discord.com/login",
    canary: "https://canary.discord.com/login"
};

const branchArg = process.argv.find(a => a.startsWith("--branch="))?.split("=")[1] ?? "stable";
const branches = branchArg === "both" ? ["stable", "canary"] : [branchArg];

for (const branch of branches) {
    if (!(branch in BRANCHES)) {
        console.error(`Bilinmeyen dal: ${branch} (stable | canary | both)`);
        process.exit(1);
    }
}

const TIMEOUT_MS = Number(process.env.REPORTER_TIMEOUT ?? 900_000);

/**
 * Akış sessizlik eşiği: reporter her kırık girdiyi anında logluyor, ayrıca her
 * 20 aramada bir olay döngüsüne yer açıyor. Bu süre boyunca hiç `[REPORTER_*]`
 * satırı gelmiyorsa koşu takılmış demektir.
 */
const IDLE_MS = Number(process.env.REPORTER_IDLE ?? 90_000);

const rendererScript = readFileSync(join(DIST, "renderer.js"), "utf-8");

const results = [];
let anyFailed = false;

for (const branch of branches) {
    const report = await runBranch(branch);
    results.push({ branch, report });

    if (
        report == null || report.badPatches.length > 0 || report.badWebpackFinds.length > 0
        || (report.erroredPatches?.length ?? 0) > 0
    ) {
        anyFailed = true;
    }
}

writeFileSync(join(ROOT, "report.json"), JSON.stringify(results, null, 4));

const markdown = renderMarkdown(results);
writeFileSync(join(ROOT, "report.md"), markdown);
console.log(`\n${markdown}`);

appendPatchTimings(results);
writeEagerModuleList(results);

// Kanarya erken uyarı: canary sonuçları ayrı kanala gidiyor (plan §9.3).
for (const { branch, report } of results) {
    const url = branch === "canary"
        ? (process.env.CANARY_WEBHOOK_URL ?? process.env.WEBHOOK_URL)
        : process.env.WEBHOOK_URL;

    if (url) await postWebhook(url, renderMarkdown([{ branch, report }]));
}

process.exit(anyFailed ? 1 : 0);

// ─────────────────────────────────────────────────────────────────────────────

async function runBranch(branch) {
    console.log(`\n[MCord] ${branch} koşusu başlıyor…`);

    const browser = await puppeteer.launch({
        executablePath: process.env.CHROMIUM_BIN,
        headless: true,
        protocolTimeout: TIMEOUT_MS + 60_000,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--autoplay-policy=no-user-gesture-required"
        ]
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36");
        await page.setBypassCSP(true);

        // Her koşuda: sayfa hataları + MCord/renderer log'ları stderr'e. Bunlar
        // olmadan CI'da "başlıyor sonra sessizlik" durumunun neden olduğu
        // görülemiyor. (REPORTER_DEBUG=1 ise TÜM konsol satırları.)
        page.on("pageerror", e => process.stderr.write(`  [pageerror] ${String(e).slice(0, 300)}\n`));
        page.on("console", m => {
            const t = m.text();
            if (process.env.REPORTER_DEBUG) {
                process.stderr.write(`  [page:${m.type()}] ${t.slice(0, 300)}\n`);
            } else if (m.type() === "error" || /\bMCord\b|Reporter:|LazyChunks|PluginManager|Webpack/.test(t)) {
                process.stderr.write(`  [page] ${t.slice(0, 240)}\n`);
            }
        });
        if (process.env.REPORTER_DEBUG) {
            page.on("requestfailed", r => process.stderr.write(`  [reqfail] ${r.url().slice(0, 120)} — ${r.failure()?.errorText}\n`));
        }

        // Renderer bundle'ı sayfanın kendi scriptlerinden **önce** çalışmalı:
        // `Function.prototype.m` tuzağı webpack başlamadan kurulmuş olmalı.
        await page.evaluateOnNewDocument(`
            if (location.host.endsWith("discord.com")) {
                ${rendererScript}
            }
        `);

        const done = waitForReport(page);
        // `done` bir `runBranch` hatasından sonra reject olursa Node "unhandled
        // rejection" ile çöküyor — sessizce yut, gerçek hatayı aşağıdaki
        // catch zaten raporluyor.
        done.catch(() => {});

        // `/login` bazen client-side redirect yapıyor (`net::ERR_ABORTED`); bu
        // durumda renderer zaten enjekte olmuş oluyor, reporter çalışır. Diğer
        // goto hataları gerçek — onları fırlat.
        try {
            // `domcontentloaded` yeterli: reporter kendi akışını
            // (`[REPORTER_*]`) ayrıca bekliyor. `load`'u beklemek, tüm
            // pluginler etkinken (reporter modu) sayfanın `load` olayı geç
            // tetiklendiği için yanlışlıkla zaman aşımı veriyordu.
            await page.goto(BRANCHES[branch], { waitUntil: "domcontentloaded", timeout: 180_000 });
        } catch (err) {
            if (!String(err?.message).includes("ERR_ABORTED")) throw err;
            process.stderr.write("  goto: ERR_ABORTED (redirect) — renderer enjekte edildi, devam.\n");
        }

        const report = await done;
        console.log(`[MCord] ${branch}: build ${report.meta.buildNumber}, ` +
            `${report.badPatches.length} kırık patch, ${report.badWebpackFinds.length} kırık arama.`);

        return report;
    } catch (err) {
        console.error(`[MCord] ${branch} koşusu başarısız:`, err.message);
        return null;
    } finally {
        await browser.close();
    }
}

/**
 * Reporter sonuçları **akış halinde** geliyor (Vencord yaklaşımı): her kırık
 * finder/patch anında loglanıyor, `[REPORTER_DONE]` sonda tam raporu taşıyor.
 * Böyle 20 bin modülle bile sayfa donmadan ilerliyor.
 */
function waitForReport(page) {
    const partial = {
        meta: { buildNumber: "?", buildHash: null },
        badPatches: [],
        erroredPatches: [],
        erroredPatchGroups: [],
        slowPatches: [],
        badWebpackFinds: [],
        traces: [],
        otherErrors: []
    };

    return new Promise((resolve, reject) => {
        // Idle timer yalnız `[REPORTER_META]` görüldükten SONRA devreye giriyor:
        // ondan önce renderer başlatma + loadLazyChunks (ağ-bağımlı, dakikalarca
        // sürebilir, hiç `[REPORTER_*]` basmaz) var — o aşamada sadece hard
        // timeout koruyor.
        let idleTimer = null;
        let metaSeen = false;

        function armIdleTimer() {
            return setTimeout(
                () => reject(new Error(`Reporter ${Math.round(IDLE_MS / 1000)} sn boyunca sessiz kaldı`)),
                IDLE_MS
            );
        }
        function bump() {
            if (!metaSeen) return;
            clearTimeout(idleTimer);
            idleTimer = armIdleTimer();
        }

        const hardTimer = setTimeout(
            () => reject(new Error(`Reporter ${Math.round(TIMEOUT_MS / 1000)} sn içinde bitmedi`)),
            TIMEOUT_MS
        );

        function finish(report) {
            if (idleTimer) clearTimeout(idleTimer);
            clearTimeout(hardTimer);
            resolve(report ?? partial);
        }

        // Idle timer'ı **her** konsol satırında sıfırlıyoruz: JS olay döngüsü
        // gerçekten kilitlenirse Discord'un kendi log'ları da durur — bu yüzden
        // "hiç satır yok" gerçek bir donma göstergesi. `loadLazyChunks` dakikalarca
        // sürebilir ama sürekli log basar, o yüzden takılmış saymayız.
        page.on("console", message => {
            bump();

            const text = message.text();
            if (!text.startsWith("[REPORTER_")) return;

            const [, tag, ...rest] = text.match(/^\[(REPORTER_[A-Z_]+)\]\s*(.*)$/s) ?? [];
            const payload = rest.join(" ");

            switch (tag) {
                case "REPORTER_META":
                    try { partial.meta = JSON.parse(payload); } catch { /* yoksa */ }
                    process.stderr.write(`  … meta alındı (build ${partial.meta.buildNumber})\n`);
                    // Artık akış başladı — idle timer'ı devreye al.
                    if (!metaSeen) { metaSeen = true; idleTimer = armIdleTimer(); }
                    break;
                case "REPORTER_PHASE":
                    process.stderr.write(`  ▸ ${payload}\n`);
                    break;
                case "REPORTER_PROGRESS":
                    process.stderr.write(`  … ${payload}\n`);
                    break;
                case "REPORTER_CHECK":
                    if (process.env.REPORTER_DEBUG) process.stderr.write(`  → ${payload}\n`);
                    break;
                case "REPORTER_FIND_FAIL":
                    partial.badWebpackFinds.push(payload);
                    process.stderr.write(`  ✘ ${payload}\n`);
                    break;
                case "REPORTER_BAD_PATCH":
                    try { partial.badPatches.push(JSON.parse(payload)); } catch { /* yoksa */ }
                    break;
                case "REPORTER_ERRORED_PATCH":
                    try {
                        const g = JSON.parse(payload);
                        partial.erroredPatchGroups.push(g);
                        process.stderr.write(`  ✘ patch errored: ${g.plugins} (${g.count} modül)\n`);
                    } catch { /* yoksa */ }
                    break;
                case "REPORTER_SLOW_PATCH":
                    try { partial.slowPatches.push(JSON.parse(payload)); } catch { /* yoksa */ }
                    break;
                case "REPORTER_DONE":
                    try { finish(JSON.parse(payload)); } catch { finish(null); }
                    break;
                case "REPORTER_FAILED":
                    clearTimeout(idleTimer);
                    clearTimeout(hardTimer);
                    reject(new Error(payload || text));
                    break;
            }
        });

        page.on("pageerror", () => { /* sayfa hataları renderer tarafında rapora giriyor */ });
    });
}

function renderMarkdown(results) {
    const lines = [`# MCord Reporter — v${PackageJson.version}`, ""];

    for (const { branch, report } of results) {
        lines.push(`## ${branch}`, "");

        if (report == null) {
            lines.push("❌ **Koşu tamamlanamadı.**", "");
            continue;
        }

        const { meta, badPatches, slowPatches, badWebpackFinds, otherErrors } = report;
        const erroredPatches = report.erroredPatches ?? [];

        lines.push(
            `- Discord build: **${meta.buildNumber}** (\`${meta.buildHash ?? "?"}\`)`,
            `- Modül sayısı: ${meta.moduleCount}`,
            `- MCord: \`${meta.mcordVersion}\` (\`${meta.commitHash}\`)`,
            ""
        );

        if (badPatches.length === 0 && badWebpackFinds.length === 0 && erroredPatches.length === 0) {
            lines.push("✅ Tüm patch'ler ve aramalar geçerli.", "");
        }

        if (erroredPatches.length > 0) {
            const byPlugin = new Map();
            for (const e of erroredPatches) {
                const key = (e.plugins ?? []).join(", ") || "(bilinmiyor)";
                const g = byPlugin.get(key) ?? { count: 0, sample: e.error };
                g.count++;
                byPlugin.set(key, g);
            }
            lines.push(`### 💥 Çalışma-anı patch hataları (${erroredPatches.length} modül)`, "");
            for (const [plugin, g] of [...byPlugin].sort((a, b) => b[1].count - a[1].count)) {
                lines.push(`- **${plugin}** — ${g.count} modül — \`${truncate(g.sample)}\``);
            }
            lines.push("");
        }

        if (badPatches.length > 0) {
            lines.push(`### ❌ Kırık patch'ler (${badPatches.length})`, "");
            for (const patch of badPatches) {
                lines.push(`- **${patch.plugin}** — \`${truncate(patch.find)}\``);
                lines.push(`  - gerekçe: ${patch.reason}`);
            }
            lines.push("");
        }

        if (badWebpackFinds.length > 0) {
            lines.push(`### ❌ Kırık aramalar (${badWebpackFinds.length})`, "");
            for (const entry of badWebpackFinds) lines.push(`- \`${truncate(entry)}\``);
            lines.push("");
        }

        if (slowPatches.length > 0) {
            lines.push(`### 🐌 Yavaş patch'ler (${slowPatches.length})`, "");
            for (const patch of slowPatches.slice(0, 20)) {
                lines.push(`- **${patch.plugin}** — ${patch.time} ms — \`${truncate(patch.match)}\``);
            }
            lines.push("");
        }

        if (otherErrors.length > 0) {
            lines.push(`### ⚠️ Diğer hatalar (${otherErrors.length})`, "");
            for (const error of otherErrors.slice(0, 20)) lines.push(`- \`${truncate(error)}\``);
            lines.push("");
        }
    }

    return lines.join("\n");
}

function truncate(text, max = 160) {
    const flat = String(text).replaceAll("`", "\\`").replaceAll("\n", " ");
    return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

/**
 * Patch süresi zaman serisi (plan §9.3).
 *
 * Bir patch'in süresi giderek artıyorsa Discord o modülü büyütüyor demektir —
 * patch'i yeniden yazma zamanı gelmiştir. Dosya commit'lenir.
 */
function appendPatchTimings(results) {
    const metricsDir = join(ROOT, "metrics");
    const metricsFile = join(metricsDir, "patchTimings.json");

    mkdirSync(metricsDir, { recursive: true });

    const history = existsSync(metricsFile)
        ? JSON.parse(readFileSync(metricsFile, "utf-8"))
        : [];

    for (const { branch, report } of results) {
        if (report == null) continue;

        history.push({
            timestamp: report.meta.timestamp,
            branch,
            buildNumber: report.meta.buildNumber,
            mcordVersion: report.meta.mcordVersion,
            timings: report.slowPatches.map(p => ({
                plugin: p.plugin,
                match: p.match,
                time: p.time
            }))
        });
    }

    // Son 500 koşuyu tut — dosya sonsuza kadar büyümesin.
    const trimmed = history.slice(-500);
    writeFileSync(metricsFile, JSON.stringify(trimmed, null, 4));

    console.log(`[MCord] Patch süresi zaman serisi güncellendi (${trimmed.length} kayıt).`);
}

/**
 * Seçici eager patch listesini üretir (plan §11.1).
 *
 * Patch süresi eşiği aşan modüller eager'a alınır: bu modüller pahalı ve
 * uygulamanın sıcak yolunda; maliyeti başlangıçta ödemek, kullanıcı etkileşimi
 * sırasında ödemekten iyi. Liste `src/webpack/eagerModules.json`'a yazılır ve
 * commit'lenir.
 */
function writeEagerModuleList(results) {
    const EAGER_THRESHOLD_MS = 2;

    const totals = new Map();
    let buildNumber = null;

    for (const { branch, report } of results) {
        if (report == null) continue;
        if (branch === "stable") buildNumber = report.meta.buildNumber;

        for (const timing of report.slowPatches) {
            totals.set(timing.moduleId, (totals.get(timing.moduleId) ?? 0) + timing.time);
        }
    }

    const moduleIds = [...totals.entries()]
        .filter(([, time]) => time >= EAGER_THRESHOLD_MS)
        .sort((a, b) => b[1] - a[1])
        .map(([moduleId]) => String(moduleId));

    const target = join(ROOT, "src", "webpack", "eagerModules.json");

    const existing = existsSync(target) ? JSON.parse(readFileSync(target, "utf-8")) : {};

    writeFileSync(target, JSON.stringify({
        ...existing,
        generatedAt: new Date().toISOString(),
        buildNumber,
        moduleIds
    }, null, 4) + "\n");

    console.log(`[MCord] Seçici eager listesi güncellendi (${moduleIds.length} modül).`);
}

async function postWebhook(url, markdown) {
    const body = JSON.stringify({
        username: "MCord Reporter",
        content: markdown.length > 1900 ? `${markdown.slice(0, 1900)}\n…` : markdown,
        embeds: []
    });

    const headers = { "Content-Type": "application/json" };

    if (process.env.WEBHOOK_SECRET) {
        headers["X-Signature"] = createHmac("sha256", process.env.WEBHOOK_SECRET)
            .update(body)
            .digest("hex");
    }

    const response = await fetch(url, { method: "POST", headers, body });

    if (!response.ok) {
        console.error(`[MCord] Webhook gönderilemedi: ${response.status} ${await response.text()}`);
    } else {
        console.log("[MCord] Rapor webhook'a gönderildi.");
    }
}
