/**
 * GAME-DEV-005 Preview smoke — discovery, detail→play, ranking, community, 404.
 * Usage: QA_BASE_URL=https://game29-xxxx.vercel.app node tools/qa/game-dev-005-preview-smoke.mjs
 */
import { chromium, devices } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.QA_BASE_URL?.replace(/\/$/, "");
if (!BASE) {
  console.error("QA_BASE_URL required");
  process.exit(1);
}

const OUT = "docs/qa/game-dev-005";
fs.mkdirSync(OUT, { recursive: true });

const report = {
  baseUrl: BASE,
  at: new Date().toISOString(),
  p0: {},
  regression: {},
  errors: [],
};

async function ok(page, name, fn) {
  try {
    await fn();
    report.p0[name] = "PASS";
    return true;
  } catch (e) {
    report.p0[name] = `FAIL: ${e instanceof Error ? e.message : String(e)}`;
    report.errors.push({ name, error: report.p0[name] });
    return false;
  }
}

async function runDesktop() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  await ok(page, "gamesList", async () => {
    await page.goto(`${BASE}/games`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForSelector('[data-testid="platform-game-card"], [data-testid="home-hero-card"]', {
      timeout: 30_000,
    });
    await page.screenshot({ path: path.join(OUT, "01-games-list.png"), fullPage: true });
  });

  for (const slug of ["snake", "agar", "bomber"]) {
    await ok(page, `${slug}DetailPlay`, async () => {
      await page.goto(`${BASE}/games/${slug}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
      const cta = page.locator('[data-testid="game-detail-play-cta"]').first();
      await cta.waitFor({ timeout: 20_000 });
      await cta.click();
      await page.waitForTimeout(3000);
      const url = page.url();
      if (!url.includes("/play") && !url.includes("snake-io")) {
        throw new Error(`Unexpected URL after Play: ${url}`);
      }
      await page.screenshot({ path: path.join(OUT, `02-${slug}-play-entry.png`), fullPage: true });
    });
  }

  await ok(page, "ranking", async () => {
    const res = await page.goto(`${BASE}/ranking`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    if (res && res.status() >= 500) throw new Error(`HTTP ${res.status()}`);
    await page.screenshot({ path: path.join(OUT, "03-ranking.png"), fullPage: true });
  });

  await ok(page, "community", async () => {
    const res = await page.goto(`${BASE}/community`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    if (res && res.status() >= 500) throw new Error(`HTTP ${res.status()}`);
    await page.screenshot({ path: path.join(OUT, "04-community.png"), fullPage: true });
  });

  await ok(page, "404", async () => {
    const res = await page.goto(`${BASE}/games/not-a-real-slug-xyz`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    if (res?.status() !== 404) throw new Error(`Expected 404, got ${res?.status()}`);
  });

  await ok(page, "commentsOnDetail", async () => {
    await page.goto(`${BASE}/games/snake`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.locator('[data-testid="game-detail-comments"]').waitFor({ timeout: 20_000 });
  });

  await ok(page, "gameRegistrationRoute", async () => {
    const res = await page.goto(`${BASE}/studio/upload`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    if (res && res.status() >= 500) throw new Error(`HTTP ${res.status()}`);
  });

  await browser.close();
}

async function runMobile() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ ...devices["iPhone 13"] });
  const page = await ctx.newPage();

  await ok(page, "mobileGamesAndDetail", async () => {
    await page.goto(`${BASE}/games`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForSelector('[data-testid="platform-game-card"], [data-testid="home-hero-card"]', {
      timeout: 30_000,
    });
    await page.screenshot({ path: path.join(OUT, "05-mobile-games.png"), fullPage: true });
    await page.goto(`${BASE}/games/snake`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.locator('[data-testid="game-detail-play-panel"]').waitFor({ timeout: 20_000 });
    await page.screenshot({ path: path.join(OUT, "06-mobile-detail.png"), fullPage: true });
  });

  await browser.close();
}

await runDesktop();
await runMobile();

const passCount = Object.values(report.p0).filter((v) => v === "PASS").length;
const total = Object.keys(report.p0).length;
report.summary = `${passCount}/${total} PASS`;

fs.writeFileSync(path.join(OUT, "smoke-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(report.errors.length ? 1 : 0);
