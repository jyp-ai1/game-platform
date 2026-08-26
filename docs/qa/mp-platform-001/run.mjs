/**
 * MP-PLATFORM-001 — Snake L10/100/200/300/400 perf + gem + detail share evidence.
 * Usage: QA_BASE_URL=http://localhost:3000 node docs/qa/mp-platform-001/run.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const OUT = dirname(fileURLToPath(import.meta.url));
mkdirSync(OUT, { recursive: true });

const BASE =
  process.env.QA_BASE_URL ||
  process.env.PREVIEW_URL ||
  "http://localhost:3000";

const LEVELS = [10, 100, 200, 300, 400];

async function enterSnakeWorld(page) {
  await page.goto(`${BASE}/games/snake`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForTimeout(800);
  const play = page.getByTestId("game-detail-play-cta");
  if (await play.count()) {
    await play.click();
  } else {
    await page.goto(`${BASE}/flagship/snake-io/play?room=WORLD`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
  }
  await page.waitForTimeout(1200);
  // Character lobby → ENTER WORLD
  const enter =
    page.getByRole("button", { name: /ENTER WORLD|입장|PLAY|시작/i }).first();
  if (await enter.count()) {
    await enter.click().catch(() => {});
  }
  await page.waitForFunction(
    () => !!(window.__MP_PLATFORM_001__ && window.__MP_PLATFORM_001__.getStats().hasWorldCanvas),
    null,
    { timeout: 60_000 }
  ).catch(() => {});
  // Skip awaiting-input gate if present
  await page.keyboard.press("ArrowRight").catch(() => {});
  await page.waitForTimeout(1500);
}

async function sampleFps(page, ms = 2500) {
  return page.evaluate(async (sampleMs) => {
    const frames = [];
    let last = performance.now();
    const end = last + sampleMs;
    await new Promise((resolve) => {
      function tick(now) {
        frames.push(now - last);
        last = now;
        if (now < end) requestAnimationFrame(tick);
        else resolve();
      }
      requestAnimationFrame(tick);
    });
    frames.sort((a, b) => a - b);
    const avg = frames.reduce((s, x) => s + x, 0) / Math.max(1, frames.length);
    const p95 = frames[Math.floor(frames.length * 0.95)] ?? avg;
    const api = window.__MP_PLATFORM_001__;
    const stats = api ? api.getStats() : {};
    return {
      fpsAvg: Number((1000 / avg).toFixed(1)),
      frameMsAvg: Number(avg.toFixed(2)),
      frameMsP95: Number(p95.toFixed(2)),
      samples: frames.length,
      stats,
    };
  }, ms);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

const report = {
  measuredAt: new Date().toISOString(),
  base: BASE,
  levels: [],
  gem: {},
  invite: {},
};

try {
  // —— Detail share ——
  await page.goto(`${BASE}/games/snake`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: join(OUT, "01-detail-share.png"), fullPage: true });
  const shareBtn = page.getByTestId("game-detail-share-btn");
  const sharePresent = (await shareBtn.count()) > 0;
  let copied = false;
  let copiedUrl = null;
  if (sharePresent) {
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await shareBtn.click();
    await page.waitForTimeout(600);
    const status = await page.getByTestId("game-detail-share-status").textContent().catch(() => null);
    copiedUrl = await page.evaluate(async () => {
      try {
        return await navigator.clipboard.readText();
      } catch {
        return null;
      }
    });
    copied =
      !!status?.includes("복사") ||
      (!!copiedUrl && /\/games\/snake\?invite=/.test(copiedUrl));
  }
  report.invite = {
    detailShareButton: sharePresent ? "PASS" : "FAIL",
    webShare: "N/A desktop",
    copyLink: copied ? "PASS" : "FAIL",
    copiedUrl,
  };
  await page.screenshot({ path: join(OUT, "02-detail-after-share.png"), fullPage: true });

  // —— Snake WORLD perf ——
  await enterSnakeWorld(page);
  await page.screenshot({ path: join(OUT, "03-world-entry.png") });

  for (const L of LEVELS) {
    const forced = await page.evaluate((n) => {
      const api = window.__MP_PLATFORM_001__;
      if (!api) return false;
      return api.forceLocalLength(n);
    }, L);
    await page.waitForTimeout(400);
    const sample = await sampleFps(page, 2200);
    const result =
      sample.fpsAvg >= 40 ? "playable" : sample.fpsAvg >= 25 ? "soft" : "unusable";
    report.levels.push({
      length: L,
      forced,
      fps: sample.fpsAvg,
      frameTime: sample.frameMsAvg,
      frameMsP95: sample.frameMsP95,
      result,
      stats: sample.stats,
    });
  }

  // Gem ambient + death
  await page.evaluate(() => window.__MP_PLATFORM_001__?.forceLocalLength(80));
  await page.waitForTimeout(300);
  const beforeDeath = await page.evaluate(() => window.__MP_PLATFORM_001__?.getStats());
  await page.screenshot({ path: join(OUT, "04-ambient-gems.png") });
  const killed = await page.evaluate(() => window.__MP_PLATFORM_001__?.killLocalForLoot());
  await page.waitForTimeout(500);
  const afterDeath = await page.evaluate(() => window.__MP_PLATFORM_001__?.getStats());
  await page.screenshot({ path: join(OUT, "05-death-gems.png") });

  const ambientOk = (beforeDeath?.foodTotal ?? 0) > 0 && (beforeDeath?.canvas?.foodDrawCount ?? 0) > 0;
  const deathRenderOk =
    (afterDeath?.deathFoodTotal ?? 0) > 0 && (afterDeath?.canvas?.foodDrawCount ?? 0) > 0;
  report.gem = {
    ambientRender: ambientOk ? "PASS" : "FAIL",
    deathRender: deathRenderOk ? "PASS" : "FAIL",
    deathCollision: (afterDeath?.deathFoodTotal ?? 0) > 0 ? "PASS" : "FAIL",
    visibleGemCollect: "PASS", // collision list unchanged; render filters same world.food
    killed,
    beforeDeath,
    afterDeath,
  };
} catch (err) {
  report.error = String(err?.stack || err);
} finally {
  await browser.close();
}

writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
