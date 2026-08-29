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
 *   DISCORD_TOKEN   İsteğe bağlı; verilirse giriş yapılır, daha çok modül yüklenir
 *   WEBHOOK_URL     İsteğe bağlı; verilirse sonuç Discord webhook'una gönderilir
 *   WEBHOOK_SECRET  İsteğe bağlı; verilirse gövde HMAC-SHA256 ile imzalanır
 */

import { createHmac } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import puppeteer from "puppeteer-core";

import { DIST, PackageJson, ROOT } from "./build/common.mjs";

const BRANCHES = {
    stable: "https://discord.com/app",
    canary: "https://canary.discord.com/app"
};

const branchArg = process.argv.find(a => a.startsWith("--branch="))?.split("=")[1] ?? "stable";
const branches = branchArg === "both" ? ["stable", "canary"] : [branchArg];

for (const branch of branches) {
    if (!(branch in BRANCHES)) {
        console.error(`Bilinmeyen dal: ${branch} (stable | canary | both)`);
        process.exit(1);
    }
}

const TIMEOUT_MS = Number(process.env.REPORTER_TIMEOUT ?? 300_000);

const rendererScript = readFileSync(join(DIST, "renderer.js"), "utf-8");

const results = [];
let anyFailed = false;

for (const branch of branches) {
    const report = await runBranch(branch);
    results.push({ branch, report });

    if (report == null || report.badPatches.length > 0 || report.badWebpackFinds.length > 0) {
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
        headless: "shell",
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--autoplay-policy=no-user-gesture-required"
        ]
    });

    try {
        const page = await browser.newPage();
        await page.setBypassCSP(true);

        // Renderer bundle'ı sayfanın kendi scriptlerinden **önce** çalışmalı:
        // `Function.prototype.m` tuzağı webpack başlamadan kurulmuş olmalı.
        await page.evaluateOnNewDocument(rendererScript);

        if (process.env.DISCORD_TOKEN) {
            await page.evaluateOnNewDocument(`
                setInterval(() => {
                    const frame = document.body?.appendChild(document.createElement("iframe"));
                    if (frame) frame.contentWindow.localStorage.token = ${JSON.stringify(`"${process.env.DISCORD_TOKEN}"`)};
                }, 50);
            `);
        }

        const done = waitForReport(page);

        await page.goto(BRANCHES[branch], { waitUntil: "domcontentloaded", timeout: 60_000 });

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

function waitForReport(page) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(
            () => reject(new Error(`Reporter ${TIMEOUT_MS} ms içinde bitmedi`)),
            TIMEOUT_MS
        );

        page.on("console", message => {
            const text = message.text();

            if (text.startsWith("[REPORTER_DONE]")) {
                clearTimeout(timer);
                try {
                    resolve(JSON.parse(text.slice("[REPORTER_DONE]".length).trim()));
                } catch (err) {
                    reject(err);
                }
                return;
            }

            if (text.startsWith("[REPORTER_FAILED]")) {
                clearTimeout(timer);
                reject(new Error(text));
            }
        });

        page.on("pageerror", () => { /* sayfa hataları rapora renderer tarafında giriyor */ });
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

        lines.push(
            `- Discord build: **${meta.buildNumber}** (\`${meta.buildHash ?? "?"}\`)`,
            `- Modül sayısı: ${meta.moduleCount}`,
            `- MCord: \`${meta.mcordVersion}\` (\`${meta.commitHash}\`)`,
            ""
        );

        if (badPatches.length === 0 && badWebpackFinds.length === 0) {
            lines.push("✅ Tüm patch'ler ve aramalar geçerli.", "");
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
