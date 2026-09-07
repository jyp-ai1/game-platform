/**
 * Sprint 16 Re:Front first-session UX smoke. Not a 4/4 MP re-QA.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = (process.env.QA_BASE_URL || "").replace(/\/$/, "");
const OUT = join(ROOT, "docs/qa/cpo/mp-cpo-2nd-product-qa/sprint16");
const ROOM = `RF-S16-${Date.now().toString(36).toUpperCase()}`;
mkdirSync(join(OUT, "evidence"), { recursive: true });

if (!BASE) {
  console.error("QA_BASE_URL required");
  process.exit(2);
}

const report = { gate: "sprint16-rf-first-session", baseUrl: BASE, room: ROOM, startedAt: new Date().toISOString() };

const browser = await chromium.launch({ headless: true });
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => {
    localStorage.setItem("play29:device-id", "rf-s16-host");
    localStorage.setItem("play29:nickname", "S16Host");
  });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/games/re-front`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.screenshot({ path: join(OUT, "evidence/01-detail.png"), fullPage: true });
  report.detailEnterWorld = /ENTER WORLD/i.test(await page.evaluate(() => document.body.innerText));

  await page.goto(`${BASE}/games/re-front/play?room=${encodeURIComponent(ROOM)}`, {
    waitUntil: "load",
    timeout: 90_000,
  });
  await page.getByTestId("mp-entry-lobby").waitFor({ state: "visible", timeout: 60_000 });
  const enter = page.getByTestId("mp-enter-world");
  if (await enter.isVisible().catch(() => false)) await enter.click();
  else await page.getByRole("button", { name: /^ENTER$/i }).click();
  await page.getByTestId("rf-game-shell").waitFor({ state: "visible", timeout: 20_000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(OUT, "evidence/02-first-session.png") });

  const body = await page.evaluate(() => document.body.innerText);
  const expandBtn = page.getByTestId("rf-expand-btn");
  report.firstSession = {
    hasExpandCta: /EXPAND/i.test(body),
    hasWinGoal: /70%/.test(body),
    noStep1Chrome: !/STEP 1/i.test(body),
    expandEnabled: await expandBtn.isEnabled().catch(() => false),
    practice: /연습모드|PRACTICE|fallback=1/i.test(body),
  };

  if (report.firstSession.expandEnabled) await expandBtn.click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(OUT, "evidence/03-after-first-expand.png") });
  report.afterExpand = /EXPAND|0\.1/i.test(await page.evaluate(() => document.body.innerText));

  await page.evaluate(() => window.__RF_QA_END_ROUND__?.());
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT, "evidence/04-result-rematch.png") });
  const resultText = await page.evaluate(() => document.body.innerText);
  report.result = {
    rematch: /REMATCH/i.test(resultText),
    another: /ANOTHER GAME/i.test(resultText),
    exit: /EXIT/i.test(resultText),
    retryGone: !/\bRETRY\b/.test(resultText),
  };

  await page.getByRole("button", { name: /EXIT/i }).click();
  await page.waitForTimeout(500);
  report.exit = /re-front/i.test(page.url());

  report.pass =
    !!report.detailEnterWorld &&
    !!report.firstSession.hasExpandCta &&
    !!report.firstSession.hasWinGoal &&
    !!report.firstSession.noStep1Chrome &&
    !!report.firstSession.expandEnabled &&
    !report.firstSession.practice &&
    !!report.result.rematch &&
    !!report.result.another &&
    !!report.result.exit &&
    !!report.result.retryGone &&
    !!report.exit;
  report.finishedAt = new Date().toISOString();
  writeFileSync(join(OUT, "qa-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ verdict: report.pass ? "PASS" : "HOLD", report }, null, 2));
  process.exit(report.pass ? 0 : 1);
} finally {
  await browser.close();
}
