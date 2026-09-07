/**
 * Re:Front Long Sprint browser QA. Real EXPAND only — no end-round helper.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = (process.env.QA_BASE_URL || "").replace(/\/$/, "");
const OUT = join(ROOT, "docs/qa/cpo/mp-cpo-2nd-product-qa/re-front-complete");
const ROOM = `RF-DONE-${Date.now().toString(36).toUpperCase()}`;
const PLAY_MS = Number(process.env.RF_COMPLETE_PLAY_MS || 10 * 60 * 1000);
mkdirSync(join(OUT, "evidence"), { recursive: true });

if (!BASE) {
  console.error("QA_BASE_URL required");
  process.exit(2);
}

const report = {
  gate: "re-front-complete",
  baseUrl: BASE,
  room: ROOM,
  helperUsed: false,
  startedAt: new Date().toISOString(),
};

async function enterFromDetail(page, room, shots) {
  await page.goto(`${BASE}/games/re-front`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  if (shots?.detail) {
    await page.screenshot({ path: join(OUT, "evidence/01-detail.png"), fullPage: true });
    const detailText = await page.evaluate(() => document.body.innerText);
    report.detailEnterWorld = /ENTER WORLD/i.test(detailText) && /MULTIPLAYER/i.test(detailText);
    const cta = page.getByRole("link", { name: /ENTER WORLD/i });
    if (await cta.isVisible({ timeout: 8_000 }).catch(() => false)) await cta.click();
  }
  if (!page.url().includes("/play") || !page.url().includes("room=")) {
    await page.goto(`${BASE}/games/re-front/play?room=${encodeURIComponent(room)}`, {
      waitUntil: "load",
      timeout: 90_000,
    });
  }
  await page.getByTestId("mp-entry-lobby").waitFor({ state: "visible", timeout: 60_000 });
  if (shots?.entry) {
    await page.screenshot({ path: join(OUT, "evidence/02-entry.png") });
    report.entryLobby = true;
  }
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
      phase: qa?.mission?.phase ?? null,
      youWin: /YOU WIN/i.test(text),
      defeat: /DEFEAT/i.test(text),
      resultVisible: !!document.querySelector('[data-testid="rf-rematch-btn"]'),
      territoryHud: /Territory\s+[\d.]+%\s+\/\s+70%/.test(text),
      practice: /연습모드|PRACTICE|fallback=1/i.test(text),
    };
  });
}

async function playToEnd(page, labels) {
  const expandBtn = page.getByTestId("rf-expand-btn");
  const started = Date.now();
  let midShot = false;
  let coreShot = false;
  while (Date.now() - started < PLAY_MS) {
    const snap = await snapshot(page);
    if (!coreShot && typeof snap.pct === "number" && snap.pct >= 0.12) {
      await page.screenshot({ path: join(OUT, `evidence/${labels.core}`) });
      report.coreGameplay = snap;
      coreShot = true;
    }
    if (!midShot && typeof snap.pct === "number" && snap.pct >= 8) {
      await page.screenshot({ path: join(OUT, `evidence/${labels.progress}`) });
      report.progress = snap;
      midShot = true;
    }
    if (snap.youWin || snap.defeat || snap.resultVisible) {
      report.end = snap;
      report.playMs = Date.now() - started;
      return snap;
    }
    const enabled = await expandBtn.isEnabled().catch(() => false);
    const visible = await expandBtn.isVisible().catch(() => false);
    if (enabled && visible) {
      const box = await expandBtn.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.waitForTimeout(500);
        await page.mouse.up();
        continue;
      }
      await expandBtn.click({ timeout: 2_000 }).catch(() => {});
      await page.waitForTimeout(80);
      continue;
    }
    await page.waitForTimeout(180);
  }
  report.end = await snapshot(page);
  report.playMs = Date.now() - started;
  return report.end;
}

const browser = await chromium.launch({ headless: true });
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => {
    localStorage.setItem("play29:device-id", "rf-complete-host");
    localStorage.setItem("play29:nickname", "RFComplete");
  });
  const page = await ctx.newPage();

  await enterFromDetail(page, ROOM, { detail: true, entry: true });
  await page.waitForTimeout(800);
  const first = await playToEnd(page, { core: "03-core-gameplay.png", progress: "04-progress-or-state.png" });
  await page.screenshot({ path: join(OUT, "evidence/05-real-win-or-lose.png") });
  await page.screenshot({ path: join(OUT, "evidence/06-result.png") });
  report.firstEnd = first;
  report.realPlayEnd = !!(first?.youWin || first?.defeat) && !report.helperUsed && first?.resultVisible;

  if (!report.realPlayEnd) {
    report.pass = false;
    report.verdict = "HOLD";
    report.finishedAt = new Date().toISOString();
    writeFileSync(join(OUT, "qa-report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ verdict: "HOLD", report }, null, 2));
    process.exit(1);
  }

  await page.getByTestId("rf-rematch-btn").click();
  await page.getByTestId("rf-game-shell").waitFor({ state: "visible", timeout: 15_000 });
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(OUT, "evidence/07-rematch-or-another-game.png") });
  report.rematch = {
    backInWorld: await page.getByTestId("rf-game-shell").isVisible(),
    noResult: !(await page.getByTestId("rf-rematch-btn").isVisible().catch(() => false)),
  };

  const second = await playToEnd(page, { core: "03b-second-core.png", progress: "04b-second-progress.png" });
  report.secondEnd = second;
  await page.getByRole("button", { name: "EXIT", exact: true }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(OUT, "evidence/08-exit.png") });
  report.exit = { url: page.url(), ok: /\/games\/re-front/.test(page.url()) };

  report.pass =
    !!report.detailEnterWorld &&
    !!report.entryLobby &&
    !!report.coreGameplay &&
    !!report.realPlayEnd &&
    (first.youWin || first.defeat) &&
    !!report.rematch.backInWorld &&
    !!report.exit.ok &&
    !report.helperUsed;
  report.verdict = report.pass ? "PASS" : "HOLD";
  report.finishedAt = new Date().toISOString();
  writeFileSync(join(OUT, "qa-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ verdict: report.verdict, report }, null, 2));
  process.exit(report.pass ? 0 : 1);
} finally {
  await browser.close();
}
