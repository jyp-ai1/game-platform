/**
 * Sprint 16 Re:Front first-session UX. Not a 4/4 MP re-QA.
 * Result overlay is opened with the host end-round helper only so
 * REMATCH / ANOTHER GAME / EXIT can be clicked as real buttons.
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

const report = { gate: "sprint16-final", baseUrl: BASE, room: ROOM, startedAt: new Date().toISOString() };

async function enterFromDetail(page, room, shotDetail) {
  await page.goto(`${BASE}/games/re-front`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  if (shotDetail) {
    await page.screenshot({ path: join(OUT, "evidence/01-detail.png"), fullPage: true });
    const detailText = await page.evaluate(() => document.body.innerText);
    report.detailEnterWorld = /ENTER WORLD/i.test(detailText) && /MULTIPLAYER/i.test(detailText);
    const cta = page.getByRole("link", { name: /ENTER WORLD/i });
    if (await cta.isVisible({ timeout: 8_000 }).catch(() => false)) await cta.click();
  }
  await page.goto(`${BASE}/games/re-front/play?room=${encodeURIComponent(room)}`, {
    waitUntil: "load",
    timeout: 90_000,
  });
  await page.getByTestId("mp-entry-lobby").waitFor({ state: "visible", timeout: 60_000 });
  const enter = page.getByTestId("mp-enter-world");
  if (await enter.isVisible().catch(() => false)) await enter.click();
  else await page.getByRole("button", { name: /^ENTER$/i }).click();
  await page.getByTestId("rf-game-shell").waitFor({ state: "visible", timeout: 20_000 });
}

async function openResult(page) {
  const end = await page.evaluate(() => {
    const qa = window.__RF_QA__?.();
    const endRound = window.__RF_QA_END_ROUND__?.();
    return { role: qa?.mpRole, endRound };
  });
  report.lastEndRound = end;
  if (!end?.endRound?.ok) {
    await page.screenshot({ path: join(OUT, "evidence/00-end-round-failed.png") });
    throw new Error(`end_round_failed role=${end?.role}`);
  }
  await page.getByTestId("rf-rematch-btn").waitFor({ state: "visible", timeout: 10_000 });
}

const browser = await chromium.launch({ headless: true });
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => {
    localStorage.setItem("play29:device-id", "rf-s16-host");
    localStorage.setItem("play29:nickname", "S16Host");
  });
  const page = await ctx.newPage();

  await enterFromDetail(page, ROOM, true);
  await page.waitForTimeout(900);
  await page.screenshot({ path: join(OUT, "evidence/02-first-session.png") });
  const body = await page.evaluate(() => document.body.innerText);
  const expandBtn = page.getByTestId("rf-expand-btn");
  const confirm = page.getByTestId("rf-expand-confirm");
  report.firstSession = {
    hasExpandCta: /EXPAND로 영토를 넓히세요|EXPAND/i.test(body),
    hasWinGoal: /70%/.test(body),
    tilePreselected: await confirm.isVisible().catch(() => false),
    expandEnabled: await expandBtn.isEnabled().catch(() => false),
    practice: /연습모드|PRACTICE|fallback=1/i.test(body),
  };

  await expandBtn.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(OUT, "evidence/03-after-first-expand.png") });
  const after = await page.evaluate(() => document.body.innerText);
  report.afterExpand = {
    nextExpand: /옆칸|EXPAND를 다시|1\/3/.test(after),
    pctUp: /0\.11%/.test(after),
  };

  await openResult(page);
  await page.screenshot({ path: join(OUT, "evidence/04-result-rematch.png") });
  const resultText = await page.evaluate(() => document.body.innerText);
  report.result = {
    rematchLabel: /REMATCH/i.test(resultText),
    anotherLabel: /ANOTHER GAME/i.test(resultText),
    exitLabel: /\bEXIT\b/.test(resultText),
    retryGone: !/\bRETRY\b/.test(resultText),
    winGoalShown: /70%/.test(resultText),
    openedBy: "host_end_round_helper_then_real_buttons",
  };

  await page.getByTestId("rf-rematch-btn").click();
  await page.getByTestId("rf-game-shell").waitFor({ state: "visible", timeout: 15_000 });
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(OUT, "evidence/05-after-rematch.png") });
  report.rematch = {
    backInWorld: await page.getByTestId("rf-game-shell").isVisible(),
    noResult: !(await page.getByTestId("rf-rematch-btn").isVisible().catch(() => false)),
  };

  await openResult(page);
  await page.getByTestId("mp-death-play-another").click();
  await page.waitForURL(/\/games\/?$/, { timeout: 15_000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT, "evidence/06-another-game.png") });
  report.anotherGame = { url: page.url(), ok: /\/games\/?$/.test(new URL(page.url()).pathname) };

  await enterFromDetail(page, `${ROOM}-EXIT`, false);
  await openResult(page);
  await page.getByRole("button", { name: "EXIT", exact: true }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(OUT, "evidence/07-exit.png") });
  report.exit = { url: page.url(), ok: /\/games\/re-front/.test(page.url()) };

  report.pass =
    !!report.detailEnterWorld &&
    !!report.firstSession.hasExpandCta &&
    !!report.firstSession.hasWinGoal &&
    !!report.firstSession.tilePreselected &&
    !!report.firstSession.expandEnabled &&
    !report.firstSession.practice &&
    !!report.afterExpand.pctUp &&
    !!report.result.rematchLabel &&
    !!report.result.anotherLabel &&
    !!report.result.retryGone &&
    !!report.rematch.backInWorld &&
    !!report.anotherGame.ok &&
    !!report.exit.ok;
  report.finishedAt = new Date().toISOString();
  writeFileSync(join(OUT, "qa-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ verdict: report.pass ? "PASS" : "HOLD", report }, null, 2));
  process.exit(report.pass ? 0 : 1);
} finally {
  await browser.close();
}
