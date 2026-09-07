/**
 * Sprint 16 final check: real EXPAND play toward 70% Territory Victory.
 * Does not call __RF_QA_END_ROUND__. Helper wins are not evidence.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = (process.env.QA_BASE_URL || "").replace(/\/$/, "");
const OUT = join(ROOT, "docs/qa/cpo/mp-cpo-2nd-product-qa/sprint16");
const ROOM = `RF-S16-70-${Date.now().toString(36).toUpperCase()}`;
const PLAY_MS = Number(process.env.RF_70_PLAY_MS || 90_000);
mkdirSync(join(OUT, "evidence"), { recursive: true });

if (!BASE) {
  console.error("QA_BASE_URL required");
  process.exit(2);
}

const report = {
  gate: "sprint16-70-percent-victory",
  baseUrl: BASE,
  room: ROOM,
  helperUsed: false,
  startedAt: new Date().toISOString(),
};

async function enterWorld(page) {
  await page.goto(`${BASE}/games/re-front`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  const cta = page.getByRole("link", { name: /ENTER WORLD/i });
  if (await cta.isVisible({ timeout: 8_000 }).catch(() => false)) await cta.click();
  if (!page.url().includes("/play")) {
    await page.goto(`${BASE}/games/re-front/play?room=${encodeURIComponent(ROOM)}`, {
      waitUntil: "load",
      timeout: 90_000,
    });
  } else if (!page.url().includes("room=")) {
    await page.goto(`${BASE}/games/re-front/play?room=${encodeURIComponent(ROOM)}`, {
      waitUntil: "load",
      timeout: 90_000,
    });
  }
  await page.getByTestId("mp-entry-lobby").waitFor({ state: "visible", timeout: 60_000 });
  const enter = page.getByTestId("mp-enter-world");
  if (await enter.isVisible().catch(() => false)) await enter.click();
  else await page.getByRole("button", { name: /^ENTER$/i }).click();
  await page.getByTestId("rf-game-shell").waitFor({ state: "visible", timeout: 20_000 });
}

async function snapshot(page) {
  return page.evaluate(() => {
    const qa = window.__RF_QA__?.();
    const text = document.body.innerText;
    return {
      pct: qa?.me?.territoryPct ?? null,
      troops: qa?.me?.troops ?? null,
      gold: qa?.me?.gold ?? null,
      population: qa?.me?.population ?? null,
      phase: qa?.mission?.phase ?? null,
      expandCount: qa?.mission?.expandCount ?? null,
      youWin: /YOU WIN/i.test(text),
      resultVisible: !!document.querySelector('[data-testid="rf-rematch-btn"]'),
      territoryHud: /Territory\s+[\d.]+%\s+\/\s+70%/.test(text),
      practice: /연습모드|PRACTICE|fallback=1/i.test(text),
    };
  });
}

const browser = await chromium.launch({ headless: true });
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => {
    localStorage.setItem("play29:device-id", "rf-s16-70-host");
    localStorage.setItem("play29:nickname", "S16Host70");
  });
  const page = await ctx.newPage();

  await enterWorld(page);
  await page.waitForTimeout(900);
  report.start = await snapshot(page);
  await page.screenshot({ path: join(OUT, "evidence/08a-70-start.png") });

  const expandBtn = page.getByTestId("rf-expand-btn");
  let clicks = 0;
  let lastPct = report.start.pct;
  const started = Date.now();
  while (Date.now() - started < PLAY_MS) {
    const mid = await snapshot(page);
    if (mid.youWin || mid.resultVisible) {
      report.victoryDuringPlay = mid;
      break;
    }
    const enabled = await expandBtn.isEnabled().catch(() => false);
    const visible = await expandBtn.isVisible().catch(() => false);
    if (enabled && visible) {
      await expandBtn.click();
      clicks += 1;
      await page.waitForTimeout(450);
      const after = await snapshot(page);
      if (typeof after.pct === "number" && typeof lastPct === "number" && after.pct > lastPct) {
        lastPct = after.pct;
      }
      if (clicks === 8) {
        report.afterEightExpands = after;
        await page.screenshot({ path: join(OUT, "evidence/08b-70-after-expands.png") });
      }
      continue;
    }
    await page.waitForTimeout(350);
  }

  report.expandClicks = clicks;
  report.end = await snapshot(page);
  report.playMs = Date.now() - started;
  const hud = await page.evaluate(() => document.body.innerText);
  report.endHud = {
    territoryLine: (hud.match(/Territory\s+[\d.]+%\s+\/\s+70%/) || [])[0] || null,
    toWinLine: (hud.match(/[\d.]+%\s+to win/) || [])[0] || null,
    youWin: /YOU WIN/i.test(hud),
  };

  await page.screenshot({ path: join(OUT, "evidence/08-70-percent-victory.png") });

  const reached70 = typeof report.end.pct === "number" && report.end.pct >= 70;
  const realVictory = reached70 && (report.end.youWin || report.end.resultVisible);
  report.pass = realVictory && !report.helperUsed && !report.start.practice && !report.end.practice;
  report.verdict = report.pass ? "PASS" : "HOLD";
  report.finishedAt = new Date().toISOString();
  writeFileSync(join(OUT, "70-percent-verify.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ verdict: report.verdict, report }, null, 2));
  process.exit(report.pass ? 0 : 1);
} finally {
  await browser.close();
}
