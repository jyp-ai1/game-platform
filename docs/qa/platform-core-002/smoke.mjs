/**
 * PLATFORM-CORE-002 Phase 1 — targeted smoke (Color step + Solo home + MP lobby).
 * Usage (PowerShell):
 *   $env:QA_BASE_URL="https://game29-xxx.vercel.app"; node docs/qa/platform-core-002/smoke.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const BASE = process.env.QA_BASE_URL ?? "http://127.0.0.1:3000";
const OUT = dirname(fileURLToPath(import.meta.url));
const COMMIT = process.env.QA_COMMIT ?? "local";

mkdirSync(OUT, { recursive: true });

const MP = [
  { slug: "snake", detail: "/games/snake" },
  { slug: "agar", detail: "/games/agar" },
  { slug: "bomber", detail: "/games/bomber" },
];

const log = {
  task: "PLATFORM-CORE-002 Phase 1",
  base: BASE,
  commit: COMMIT,
  startedAt: new Date().toISOString(),
  checks: [],
};

const mark = (name, ok, detail = {}) => {
  log.checks.push({ name, ok, ...detail, t: new Date().toISOString() });
  return ok;
};

async function mpLobby(page, game, idx) {
  await page.goto(`${BASE}${game.detail}`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.locator('[data-testid="game-detail-page"]').waitFor({ timeout: 30_000 });
  await page.screenshot({ path: join(OUT, `${idx}-${game.slug}-01-detail.png`) });

  const cta = page.locator('[data-testid="game-detail-play-cta"]');
  const ctaText = ((await cta.textContent()) ?? "").trim();
  mark(`${game.slug}-world-cta`, /WORLD PLAY/i.test(ctaText), { ctaText });

  await cta.click({ timeout: 15_000 });
  await page.waitForURL(/\/play/, { timeout: 60_000 });
  await page.locator('[data-testid="mp-entry-lobby"]').waitFor({ timeout: 30_000 });
  await page.screenshot({ path: join(OUT, `${idx}-${game.slug}-02-lobby.png`) });

  const hasCharacter = (await page.getByText(/^Character$/i).count()) > 0;
  const hasColor = (await page.getByText(/^Color$/i).count()) > 0;
  const hasDiff = (await page.locator('[data-testid="mp-ai-difficulty"]').count()) > 0;
  const hasEnter = (await page.locator('[data-testid="mp-enter-world"]').count()) > 0;

  mark(`${game.slug}-character`, hasCharacter);
  mark(`${game.slug}-color`, hasColor);
  mark(`${game.slug}-no-difficulty`, !hasDiff);
  mark(`${game.slug}-enter`, hasEnter);

  if (hasColor) {
    const swatch = page.locator('[data-testid="mp-entry-lobby"] button[aria-label^="Color"]').nth(1);
    if ((await swatch.count()) > 0) await swatch.click();
  }

  await page.locator('[data-testid="mp-enter-world"]').click({ timeout: 15_000 });
  await page.waitForTimeout(2200);
  await page.screenshot({ path: join(OUT, `${idx}-${game.slug}-03-playing.png`) });

  const shell =
    (await page.locator('[data-testid="mp-you-bar"], [data-testid="mp-top10"], .touch-none').count()) >
    0;
  mark(`${game.slug}-in-game`, shell);

  return hasCharacter && hasColor && !hasDiff && hasEnter && shell;
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

try {
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForTimeout(2800);
  await page.screenshot({ path: join(OUT, "00-home.png") });

  const soloStrip = (await page.locator('[data-testid="home-solo-catalog"]').count()) > 0;
  mark("solo-home-strip", soloStrip);

  const soloCards = await page
    .locator('[data-testid="home-solo-catalog"] a', { hasText: /▶\s*Re:Play/i })
    .count();
  mark("solo-home-replay-cta", soloCards > 0, { soloCards });

  const mpOk = [];
  for (let i = 0; i < MP.length; i++) {
    mpOk.push(await mpLobby(page, MP[i], i + 1));
  }
  mark("mp-lobby-unified", mpOk.every(Boolean), { mpOk });

  await page.goto(`${BASE}/games/2048`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  const soloCta = page.locator('[data-testid="game-detail-play-cta"]');
  const soloText = ((await soloCta.textContent()) ?? "").trim();
  mark("solo-detail-play", /PLAY/i.test(soloText) && !/WORLD/i.test(soloText), {
    soloText,
  });
  await soloCta.click({ timeout: 15_000 });
  await page.waitForURL(/\/games\/2048\/play/, { timeout: 60_000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(OUT, "04-solo-2048-play.png") });
  mark("solo-playable", /\/games\/2048\/play/.test(page.url()));

  log.endedAt = new Date().toISOString();
  log.pass = log.checks.every((c) => c.ok);
  writeFileSync(join(OUT, "smoke-report.json"), JSON.stringify(log, null, 2));
  console.log(JSON.stringify({ pass: log.pass, checks: log.checks }, null, 2));
  if (!log.pass) process.exitCode = 1;
} catch (err) {
  log.error = String(err?.stack ?? err);
  log.pass = false;
  log.endedAt = new Date().toISOString();
  writeFileSync(join(OUT, "smoke-report.json"), JSON.stringify(log, null, 2));
  console.error(log.error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
